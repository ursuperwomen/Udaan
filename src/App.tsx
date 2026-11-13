/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  buildFallbackChecklist,
  INITIAL_INTERVIEW_QUESTIONS,
  INITIAL_PROFILE,
  INITIAL_TRACKED_APPLICATIONS,
  INITIAL_TRIP,
} from './data/visaPresets';
import {
  ActiveTab,
  ApplicantProfile,
  ApplicationStage,
  ChatMessage,
  ChecklistCategory,
  DocumentAnnotation,
  DocumentKind,
  ExtractedDocumentFields,
  InterviewQuestion,
  ReminderItem,
  TrackedApplication,
  TravelBudget,
  UploadedDocument,
  VisaPurpose,
  VisaTrip,
} from './types/visa';
import { TopNav } from './components/TopNav';
import { TripIntakeModal } from './components/TripIntakeModal';
import { ChecklistWorkspace } from './components/ChecklistWorkspace';
import { DocumentVaultView } from './components/DocumentVaultView';
import { StatusTrackerView } from './components/StatusTrackerView';
import { TravelBudgetView, extractFeeDefaults } from './components/TravelBudgetView';
import { InterviewCoachView } from './components/InterviewCoachView';
import { RightRailGuide } from './components/RightRailGuide';

const STORAGE_KEY = 'udaan_visa_workspace_v1';
const LEGACY_STORAGE_KEY = 'clearskies_visa_workspace_v1';

const INITIAL_BUDGET: TravelBudget = {
  currency: 'EUR',
  visaFee: '90',
  visaFeePaid: true,
  serviceFee: '35',
  serviceFeePaid: false,
  travelInsurance: '42',
  travelInsurancePaid: false,
  flightBookings: '680',
  flightBookingsPaid: false,
  accommodation: '540',
  accommodationPaid: false,
  customExpenses: [],
};

interface PersistedWorkspace {
  trip: VisaTrip;
  documents: UploadedDocument[];
  profile: ApplicantProfile;
  applications: TrackedApplication[];
  questions: InterviewQuestion[];
  chatMessages: ChatMessage[];
  budget?: TravelBudget;
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function createWelcomeMessage(trip: VisaTrip): ChatMessage {
  return {
    id: 'msg-welcome',
    role: 'assistant',
    content: `Welcome! You're planning a ${trip.purpose.toLowerCase()} trip from ${trip.nationality} to ${trip.destination} (${trip.visaCode}). Ask me to translate any confusing embassy term into plain English, or drop a passport/bank statement photo in Documents & Pre-Fill.`,
    timestamp: nowTimeLabel(),
  };
}

function loadInitialState(): PersistedWorkspace {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>;
      if (parsed.trip && parsed.profile) {
        return {
          trip: parsed.trip,
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          profile: parsed.profile,
          applications: Array.isArray(parsed.applications)
            ? parsed.applications
            : INITIAL_TRACKED_APPLICATIONS,
          questions: Array.isArray(parsed.questions)
            ? parsed.questions
            : INITIAL_INTERVIEW_QUESTIONS,
          chatMessages:
            Array.isArray(parsed.chatMessages) && parsed.chatMessages.length > 0
              ? parsed.chatMessages
              : [createWelcomeMessage(parsed.trip)],
          budget: parsed.budget ?? INITIAL_BUDGET,
        };
      }
    }
  } catch {
    // Ignore corrupt local storage and use clean defaults
  }
  return {
    trip: INITIAL_TRIP,
    documents: [],
    profile: INITIAL_PROFILE,
    applications: INITIAL_TRACKED_APPLICATIONS,
    questions: INITIAL_INTERVIEW_QUESTIONS,
    chatMessages: [createWelcomeMessage(INITIAL_TRIP)],
    budget: INITIAL_BUDGET,
  };
}

export default function App() {
  const [initial] = useState<PersistedWorkspace>(() => loadInitialState());

  const [activeTab, setActiveTab] = useState<ActiveTab>('checklist');
  const [trip, setTrip] = useState<VisaTrip>(initial.trip);
  const [documents, setDocuments] = useState<UploadedDocument[]>(initial.documents);
  const [profile, setProfile] = useState<ApplicantProfile>(initial.profile);
  const [applications, setApplications] = useState<TrackedApplication[]>(initial.applications);
  const [questions, setQuestions] = useState<InterviewQuestion[]>(initial.questions);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initial.chatMessages);
  const [budget, setBudget] = useState<TravelBudget>(initial.budget ?? INITIAL_BUDGET);

  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);
  const [tripError, setTripError] = useState<string | null>(null);
  const [isChatSending, setIsChatSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [uploadPresetDocType, setUploadPresetDocType] = useState<DocumentKind | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const payload: PersistedWorkspace = {
        trip,
        documents,
        profile,
        applications,
        questions,
        chatMessages,
        budget,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors when large image previews are present
    }
  }, [trip, documents, profile, applications, questions, chatMessages, budget]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  // Generate Personalized Visa Checklist
  const handleGenerateTrip = async (params: {
    nationality: string;
    destination: string;
    purpose: VisaPurpose;
    travelDate: string;
  }) => {
    setIsGeneratingTrip(true);
    setTripError(null);
    try {
      const res = await fetch('/api/visa/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach live AI checklist service.');
      }

      const generatedTrip: VisaTrip = {
        id: `trip-${Date.now()}`,
        nationality: params.nationality,
        destination: params.destination,
        visaCode: data.visaCode || 'VISA',
        visaName: data.visaName || `${params.destination} ${params.purpose} Visa`,
        purpose: params.purpose,
        travelDate: params.travelDate,
        estimatedFee: data.estimatedFee || 'Check embassy schedule',
        processingWindow: data.processingWindow || '10–20 business days',
        validityRule:
          data.validityRule || 'Ensure your passport has 6+ months of validity past departure.',
        createdAt: new Date().toISOString(),
        checklistItems: Array.isArray(data.checklistItems)
          ? data.checklistItems.map((item: Omit<VisaTrip['checklistItems'][number], 'id' | 'completed'>, idx: number) => ({
              ...item,
              id: `chk-${Date.now()}-${idx}`,
              completed: false,
            }))
          : buildFallbackChecklist(
              params.nationality,
              params.destination,
              params.purpose,
              params.travelDate
            ).checklistItems,
      };

      setTrip(generatedTrip);
      const feeSeed = extractFeeDefaults(generatedTrip.estimatedFee);
      setBudget((prev) => ({
        ...prev,
        currency: feeSeed.currency,
        visaFee: feeSeed.amount,
      }));
      setProfile((prev) => ({
        ...prev,
        nationality: params.nationality,
        intendedTravelDates: params.travelDate || prev.intendedTravelDates,
      }));
      setActiveTab('checklist');
      setIsTripModalOpen(false);
      showToast(`Built personalized checklist for ${params.nationality} → ${params.destination}`);
    } catch (err) {
      const fallback = buildFallbackChecklist(
        params.nationality,
        params.destination,
        params.purpose,
        params.travelDate
      );
      setTrip(fallback);
      setTripError(
        err instanceof Error
          ? err.message
          : 'Loaded verified template checklist because live AI was unavailable.'
      );
      setActiveTab('checklist');
      setIsTripModalOpen(false);
    } finally {
      setIsGeneratingTrip(false);
    }
  };

  // Checklist actions
  const handleToggleChecklistItem = (itemId: string) => {
    setTrip((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const handleAddCustomChecklistItem = (item: {
    title: string;
    category: ChecklistCategory;
    plainSummary: string;
  }) => {
    setTrip((prev) => ({
      ...prev,
      checklistItems: [
        ...prev.checklistItems,
        {
          id: `chk-custom-${Date.now()}`,
          category: item.category,
          title: item.title,
          plainSummary: item.plainSummary,
          eli10Explanation:
            'You added this personal reminder to keep extra supporting proof organized alongside embassy requirements.',
          required: false,
          completed: false,
        },
      ],
    }));
    showToast('Added custom item to checklist');
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    setTrip((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((i) => i.id !== itemId),
    }));
  };

  // Document Vault & Pre-Fill actions
  const handleAddDocument = (doc: UploadedDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    showToast(`Extracted details from ${doc.fileName}`);
  };

  const handleUpdateDocumentFields = (docId: string, fields: ExtractedDocumentFields) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const filteredConfirmed = d.confirmedFields?.filter((k) => Boolean(fields[k]?.trim()));
        return {
          ...d,
          extractedFields: fields,
          ...(filteredConfirmed !== undefined ? { confirmedFields: filteredConfirmed } : {}),
        };
      })
    );
  };

  const handleUpdateDocumentConfirmedFields = (
    docId: string,
    confirmedFields: Array<keyof ExtractedDocumentFields>
  ) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, confirmedFields } : d))
    );
  };

  const handleUpdateDocumentAnnotations = (docId: string, annotations: DocumentAnnotation[]) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, annotations } : d))
    );
  };

  const handleApplyToProfile = (docId: string) => {
    const target = documents.find((d) => d.id === docId);
    if (!target) return;
    const f = target.extractedFields;
    const populatedFieldKeys = (Object.keys(f) as Array<keyof ExtractedDocumentFields>).filter((k) =>
      Boolean(f[k]?.trim())
    );

    setProfile((prev) => ({
      ...prev,
      fullName: f.fullName || f.accountHolder || prev.fullName,
      passportNumber: f.passportNumber || prev.passportNumber,
      nationality: f.nationality || prev.nationality,
      dateOfBirth: f.dateOfBirth || prev.dateOfBirth,
      passportExpiry: f.expiryDate || prev.passportExpiry,
      issuingCountry: f.issuingCountry || prev.issuingCountry,
      bankBalance: f.endingBalance || prev.bankBalance,
      currency: f.currency || prev.currency,
      employerName: f.employerName || prev.employerName,
      jobTitle: f.jobTitle || prev.jobTitle,
      bookingReference: f.flightOrBookingRef || prev.bookingReference,
      intendedTravelDates: f.travelDates || prev.intendedTravelDates,
    }));

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              appliedToProfile: true,
              confirmedFields: populatedFieldKeys,
            }
          : d
      )
    );

    // Auto-check matching checklist item(s)
    setTrip((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) =>
        item.linkedDocType === target.docType ? { ...item, completed: true } : item
      ),
    }));

    showToast('Confirmed fields & applied details to your application form');
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Status Tracker actions
  const handleAddApplication = (app: TrackedApplication) => {
    setApplications((prev) => [app, ...prev]);
    showToast(`Tracking ${app.referenceNumber}`);
  };

  const handleUpdateStage = (
    appId: string,
    nextStage: ApplicationStage,
    note: string,
    keyDate?: string
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const cleanKeyDate = keyDate && /^\d{4}-\d{2}-\d{2}$/.test(keyDate) ? keyDate : undefined;
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              currentStage: nextStage,
              lastCheckedAt: today,
              statusHistory: [
                ...app.statusHistory,
                {
                  id: `log-${Date.now()}`,
                  stage: nextStage,
                  timestamp: today,
                  note,
                  ...(cleanKeyDate ? { keyDate: cleanKeyDate } : {}),
                },
              ],
            }
          : app
      )
    );
    showToast(`Updated stage to ${nextStage}`);
  };

  const handleDeleteApplication = (appId: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== appId));
  };

  const handleAddReminder = (appId: string, reminder: ReminderItem) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, reminders: [...app.reminders, reminder] } : app
      )
    );
    showToast('Reminder added');
  };

  const handleToggleReminder = (appId: string, reminderId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              reminders: app.reminders.map((r) =>
                r.id === reminderId ? { ...r, completed: !r.completed } : r
              ),
            }
          : app
      )
    );
  };

  const handleDeleteReminder = (appId: string, reminderId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? { ...app, reminders: app.reminders.filter((r) => r.id !== reminderId) }
          : app
      )
    );
  };

  // UDAAN Guide AI chat
  const handleSendChatMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: nowTimeLabel(),
    };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setIsChatSending(true);

    if (window.innerWidth < 1024) {
      setMobileChatOpen(true);
    }

    try {
      const context = {
        nationality: trip.nationality,
        destination: trip.destination,
        visaCode: trip.visaCode,
        purpose: trip.purpose,
        travelDate: trip.travelDate,
        incompleteChecklistItems: trip.checklistItems
          .filter((i) => !i.completed)
          .map((i) => i.title),
        documentWarnings: documents.flatMap((d) => d.warnings),
        trackedApplication: applications[0]
          ? {
              ref: applications[0].referenceNumber,
              stage: applications[0].currentStage,
              embassy: applications[0].embassyCity,
            }
          : null,
      };

      const res = await fetch('/api/visa/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reach UDAAN Guide.');

      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.reply,
          timestamp: nowTimeLabel(),
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content:
            err instanceof Error
              ? `I hit a quick snag connecting to the AI guide: ${err.message}`
              : 'I could not connect right now. Please try again in a moment.',
          timestamp: nowTimeLabel(),
        },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Backup Export / Import / Reset
  const handleExportBackup = () => {
    const payload: PersistedWorkspace = {
      trip,
      documents: documents.map((d) => ({ ...d, previewDataUrl: '' })),
      profile,
      applications,
      questions,
      chatMessages,
      budget,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `udaan-visa-${trip.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported workspace backup');
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as Partial<PersistedWorkspace>;
        if (parsed.trip) setTrip(parsed.trip);
        if (parsed.profile) setProfile(parsed.profile);
        if (Array.isArray(parsed.applications)) setApplications(parsed.applications);
        if (Array.isArray(parsed.questions)) setQuestions(parsed.questions);
        if (Array.isArray(parsed.documents)) setDocuments(parsed.documents);
        if (parsed.budget) setBudget(parsed.budget);
        setIsTripModalOpen(false);
        showToast('Restored workspace from backup');
      } catch {
        showToast('Could not parse backup JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleResetWorkspace = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setTrip(INITIAL_TRIP);
    setDocuments([]);
    setProfile(INITIAL_PROFILE);
    setApplications(INITIAL_TRACKED_APPLICATIONS);
    setQuestions(INITIAL_INTERVIEW_QUESTIONS);
    setChatMessages([createWelcomeMessage(INITIAL_TRIP)]);
    setBudget(INITIAL_BUDGET);
    setTripError(null);
    setIsTripModalOpen(false);
    showToast('Reset workspace to clean starter state');
  };

  const quickPrompts = [
    `What should I prepare next for ${trip.destination}?`,
    'Explain the 6-month passport validity rule',
    documents.some((d) => d.warnings.length > 0)
      ? 'Review my document warnings'
      : 'How much bank balance is usually safe?',
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewTrip={() => setIsTripModalOpen(true)}
      />

      {/* Main 12-Column Centered Workspace */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 8-Column Active Workflow */}
          <div className="lg:col-span-8 min-w-0">
            {activeTab === 'checklist' && (
              <ChecklistWorkspace
                trip={trip}
                isGenerating={isGeneratingTrip}
                generationError={tripError}
                onToggleItem={handleToggleChecklistItem}
                onAddCustomItem={handleAddCustomChecklistItem}
                onRemoveItem={handleRemoveChecklistItem}
                onOpenNewTrip={() => setIsTripModalOpen(true)}
                onAskGuide={handleSendChatMessage}
                onGoToUpload={(docType) => {
                  setUploadPresetDocType(docType);
                  setActiveTab('documents');
                }}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentVaultView
                documents={documents}
                profile={profile}
                trip={trip}
                initialDocType={uploadPresetDocType}
                onAddDocument={handleAddDocument}
                onUpdateDocumentFields={handleUpdateDocumentFields}
                onUpdateConfirmedFields={handleUpdateDocumentConfirmedFields}
                onUpdateDocumentAnnotations={handleUpdateDocumentAnnotations}
                onApplyToProfile={handleApplyToProfile}
                onRemoveDocument={handleRemoveDocument}
                onUpdateProfile={setProfile}
                onNotify={showToast}
              />
            )}

            {activeTab === 'tracker' && (
              <StatusTrackerView
                applications={applications}
                activeDestination={trip.destination}
                activeVisaCode={trip.visaCode}
                travelDate={trip.travelDate}
                processingWindow={trip.processingWindow}
                onAddApplication={handleAddApplication}
                onUpdateStage={handleUpdateStage}
                onDeleteApplication={handleDeleteApplication}
                onAddReminder={handleAddReminder}
                onToggleReminder={handleToggleReminder}
                onDeleteReminder={handleDeleteReminder}
                onAskGuide={handleSendChatMessage}
              />
            )}

            {activeTab === 'budget' && (
              <TravelBudgetView
                budget={budget}
                trip={trip}
                profile={profile}
                onUpdateBudget={setBudget}
                onAskGuide={handleSendChatMessage}
              />
            )}

            {activeTab === 'interview' && (
              <InterviewCoachView
                trip={trip}
                profile={profile}
                questions={questions}
                onSetQuestions={setQuestions}
              />
            )}
          </div>

          {/* 4-Column Persistent Conversational Guide */}
          <RightRailGuide
            messages={chatMessages}
            isSending={isChatSending}
            quickPrompts={quickPrompts}
            onSendMessage={handleSendChatMessage}
            mobileOpen={mobileChatOpen}
            onToggleMobile={setMobileChatOpen}
          />
        </div>
      </main>

      <TripIntakeModal
        isOpen={isTripModalOpen}
        initialNationality={trip.nationality}
        initialDestination={trip.destination}
        initialPurpose={trip.purpose}
        initialTravelDate={trip.travelDate}
        isGenerating={isGeneratingTrip}
        onClose={() => setIsTripModalOpen(false)}
        onGenerateTrip={handleGenerateTrip}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetWorkspace={handleResetWorkspace}
      />

      {/* Non-intrusive Completion Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#1E293B] text-white text-xs font-semibold shadow-lg flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
