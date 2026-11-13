import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('400')) {
    return { status: 400, message: 'Gemini API key appears invalid. Please verify it in Settings > Secrets.' };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return { status: 403, message: 'Permission denied for Gemini API. Check your key in Settings > Secrets.' };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return { status: 429, message: 'Rate limit reached momentarily. Please try again in a few seconds.' };
  }
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: raw };
  }
  return { status: 500, message: raw || 'Unexpected AI service error.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // 1. Personalized Visa Requirement Checklist Generator
  app.post('/api/visa/checklist', async (req: Request, res: Response) => {
    try {
      const { nationality, destination, purpose, travelDate } = req.body ?? {};
      if (!nationality || !destination || !purpose) {
        res.status(400).json({ error: 'Nationality, destination, and purpose are required.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate a personalized, accurate, plain-English visa requirement checklist for:
- Passport Nationality: ${nationality}
- Destination Country: ${destination}
- Purpose of Travel: ${purpose}
- Target Departure Date: ${travelDate || 'Upcoming'}

Follow the "10-year-old test": every plainSummary and eli10Explanation must avoid dense legal jargon and explain clearly what the document is and why the embassy asks for it. Include 6 to 8 high-value checklist items spanning Identity & Travel Docs, Financial Proof, Official Forms & Fees, and Supporting Evidence. If the nationality may enjoy visa-free/eTA/ESTA entry for this destination, state that clearly in visaName, visaCode, and the checklist items.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visaCode: { type: Type.STRING, description: 'Short official code like B1/B2, Schengen-C, eTA, ESTA, UK-STD-6M' },
              visaName: { type: Type.STRING, description: 'Plain-English name of the visa or entry authorization' },
              estimatedFee: { type: Type.STRING, description: 'Typical government fee with currency, e.g. $185 USD or €90 EUR' },
              processingWindow: { type: Type.STRING, description: 'Typical consular processing timeframe' },
              validityRule: { type: Type.STRING, description: 'Key passport validity rule in plain language' },
              checklistItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      description: 'Must be one of: Identity & Travel Docs, Financial Proof, Official Forms & Fees, Supporting Evidence',
                    },
                    title: { type: Type.STRING },
                    formCode: { type: Type.STRING },
                    plainSummary: { type: Type.STRING },
                    eli10Explanation: { type: Type.STRING },
                    required: { type: Type.BOOLEAN },
                    linkedDocType: {
                      type: Type.STRING,
                      description: 'Optional: passport, financial, itinerary, employment, or photo',
                    },
                    estimatedCost: { type: Type.STRING },
                  },
                  required: ['category', 'title', 'plainSummary', 'eli10Explanation', 'required'],
                },
              },
            },
            required: ['visaCode', 'visaName', 'estimatedFee', 'processingWindow', 'validityRule', 'checklistItems'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. AI Document Image Extraction & Pre-Fill
  app.post('/api/visa/extract-document', async (req: Request, res: Response) => {
    try {
      const { base64Data, mimeType, docType, fileName, travelDate } = req.body ?? {};
      if (!base64Data || !mimeType) {
        res.status(400).json({ error: 'Document image data and mimeType are required.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: `Inspect this uploaded visa document image (file: "${fileName || 'upload'}", user hint: "${docType || 'auto-detect'}", planned travel date: "${travelDate || 'not specified'}").
Extract all visible relevant fields accurately. Never invent fields that are not visible; leave missing fields empty or omit them.
Also write:
1. A calm 1-2 sentence plain-English summary of what this document shows.
2. Any helpful warnings for a visa officer check (e.g., if a passport expires within 6 months of "${travelDate || '2026-12-18'}", if glare/cropping makes MRZ lines hard to read, if a bank statement lacks account holder name or currency, or if a visa photo has shadows/glasses).`,
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedDocType: {
                type: Type.STRING,
                description: 'One of: passport, financial, itinerary, employment, photo',
              },
              summary: { type: Type.STRING },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedFields: {
                type: Type.OBJECT,
                properties: {
                  fullName: { type: Type.STRING },
                  passportNumber: { type: Type.STRING },
                  nationality: { type: Type.STRING },
                  dateOfBirth: { type: Type.STRING },
                  expiryDate: { type: Type.STRING },
                  issuingCountry: { type: Type.STRING },
                  accountHolder: { type: Type.STRING },
                  bankName: { type: Type.STRING },
                  endingBalance: { type: Type.STRING },
                  currency: { type: Type.STRING },
                  statementPeriod: { type: Type.STRING },
                  employerName: { type: Type.STRING },
                  jobTitle: { type: Type.STRING },
                  flightOrBookingRef: { type: Type.STRING },
                  travelDates: { type: Type.STRING },
                  destinationCity: { type: Type.STRING },
                },
              },
            },
            required: ['detectedDocType', 'summary', 'warnings', 'extractedFields'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Conversational Visa Companion & "Explain Like I'm 10" Guide
  app.post('/api/visa/chat', async (req: Request, res: Response) => {
    try {
      const { messages, context } = req.body ?? {};
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const ai = getGeminiClient();
      const historyPrompt = messages
        .slice(-10)
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Applicant' : 'UDAAN Guide'}: ${m.content}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Applicant Context:
${JSON.stringify(context ?? {}, null, 2)}

Conversation so far:
${historyPrompt}

Respond to the applicant's latest question with calm, structured, jargon-free guidance.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `You are UDAAN Guide, a warm, reassuring visa assistant built around the "10-year-old test": explain every immigration or consular rule in crystal-clear everyday English with zero scary legalese. Keep responses concise (under 140 words unless a step-by-step breakdown is requested), cite the applicant's specific nationality/destination/tracker stage from context when relevant, and remind users to confirm final rules on official embassy sites when rules depend on recent policy shifts.`,
        },
      });

      res.json({ reply: response.text ?? 'I am here to help clarify any visa step.' });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Consular Interview Prep & Practice Evaluator
  app.post('/api/visa/interview-prep', async (req: Request, res: Response) => {
    try {
      const { action, nationality, destination, purpose, travelDate, profileSummary, question, userAnswer } = req.body ?? {};
      const ai = getGeminiClient();

      if (action === 'evaluate') {
        if (!question || !userAnswer) {
          res.status(400).json({ error: 'Question and userAnswer are required.' });
          return;
        }
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Applicant: ${nationality} citizen applying for ${destination} (${purpose}) departing ${travelDate}.
Question asked by officer: "${question}"
Applicant practice answer: "${userAnswer}"

Provide encouraging, practical coaching in plain language: what sounds confident, anything vague that could trigger follow-up questions, and a 1-2 sentence polished version.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                strengths: { type: Type.STRING },
                watchOutFor: { type: Type.STRING },
                suggestedPolish: { type: Type.STRING },
              },
              required: ['strengths', 'watchOutFor', 'suggestedPolish'],
            },
          },
        });
        res.json(JSON.parse((response.text ?? '{}').trim()));
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate 5 realistic, tailored visa interview questions for a ${nationality} passport holder applying for a ${destination} ${purpose} visa (travel date: ${travelDate || 'upcoming'}). Applicant context: ${profileSummary || 'Standard applicant'}.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    whyTheyAsk: { type: Type.STRING },
                    sampleStrongAnswer: { type: Type.STRING },
                  },
                  required: ['question', 'whyTheyAsk', 'sampleStrongAnswer'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });
      res.json(JSON.parse((response.text ?? '{}').trim()));
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UDAAN server listening on http://localhost:${PORT} (bound 0.0.0.0:${PORT})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
