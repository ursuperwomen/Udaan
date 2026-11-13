import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Timer,
} from 'lucide-react';
import { ApplicantProfile, InterviewQuestion, VisaTrip } from '../types/visa';

interface InterviewCoachViewProps {
  trip: VisaTrip;
  profile: ApplicantProfile;
  questions: InterviewQuestion[];
  onSetQuestions: (questions: InterviewQuestion[]) => void;
}

interface EvaluationResult {
  strengths: string;
  watchOutFor: string;
  suggestedPolish: string;
}

const TARGET_CONCISE_SECONDS = 30;

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getPacingLabel(seconds: number): { text: string; colorClass: string } {
  if (seconds === 0) {
    return { text: 'Target ≤ 30s', colorClass: 'text-[#475569]' };
  }
  if (seconds <= TARGET_CONCISE_SECONDS) {
    return { text: 'Concise pace', colorClass: 'text-[#065F46]' };
  }
  if (seconds <= 45) {
    return { text: 'Slightly long — trim 1 detail', colorClass: 'text-[#92400E]' };
  }
  return { text: 'Over 45s — practice a tighter 2-sentence answer', colorClass: 'text-rose-700' };
}

export const InterviewCoachView: React.FC<InterviewCoachViewProps> = ({
  trip,
  profile,
  questions,
  onSetQuestions,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSample, setOpenSample] = useState<Record<string, boolean>>({});
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationResult>>({});
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  // Per-question timer state
  const [elapsedMsById, setElapsedMsById] = useState<Record<string, number>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [tickNow, setTickNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!runningId) return;
    const interval = window.setInterval(() => {
      setTickNow(Date.now());
    }, 200);
    return () => window.clearInterval(interval);
  }, [runningId]);

  const getSecondsForQuestion = (questionId: string): number => {
    const baseMs = elapsedMsById[questionId] ?? 0;
    const liveMs =
      runningId === questionId && runStartedAt !== null
        ? Math.max(0, tickNow - runStartedAt)
        : 0;
    return Math.floor((baseMs + liveMs) / 1000);
  };

  const commitActiveTimer = () => {
    if (!runningId || runStartedAt === null) return;
    const delta = Math.max(0, Date.now() - runStartedAt);
    const prevId = runningId;
    setElapsedMsById((prev) => ({
      ...prev,
      [prevId]: (prev[prevId] ?? 0) + delta,
    }));
    setRunningId(null);
    setRunStartedAt(null);
  };

  const handleToggleTimer = (questionId: string) => {
    if (runningId === questionId) {
      commitActiveTimer();
      return;
    }
    if (runningId && runStartedAt !== null) {
      const delta = Math.max(0, Date.now() - runStartedAt);
      const prevId = runningId;
      setElapsedMsById((prev) => ({
        ...prev,
        [prevId]: (prev[prevId] ?? 0) + delta,
      }));
    }
    const now = Date.now();
    setTickNow(now);
    setRunningId(questionId);
    setRunStartedAt(now);
  };

  const handleResetTimer = (questionId: string) => {
    if (runningId === questionId) {
      setRunningId(null);
      setRunStartedAt(null);
    }
    setElapsedMsById((prev) => ({ ...prev, [questionId]: 0 }));
  };

  const handleGenerateQuestions = async () => {
    commitActiveTimer();
    setIsRefreshing(true);
    setError(null);
    try {
      const profileSummary = `Name: ${profile.fullName || 'Applicant'}, Job: ${profile.jobTitle || 'Unspecified'} at ${profile.employerName || 'Unspecified'}, Savings: ${profile.bankBalance || 'Unspecified'} ${profile.currency}`;
      const res = await fetch('/api/visa/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          nationality: trip.nationality,
          destination: trip.destination,
          purpose: trip.purpose,
          travelDate: trip.travelDate,
          profileSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate tailored questions.');
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        onSetQuestions(
          data.questions.map((q: Omit<InterviewQuestion, 'id'>, idx: number) => ({
            ...q,
            id: `iq-ai-${Date.now()}-${idx}`,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh interview questions.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEvaluate = async (q: InterviewQuestion) => {
    const answer = (draftAnswers[q.id] ?? '').trim();
    if (!answer) return;
    if (runningId === q.id) {
      commitActiveTimer();
    }
    setEvaluatingId(q.id);
    setError(null);
    try {
      const res = await fetch('/api/visa/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          nationality: trip.nationality,
          destination: trip.destination,
          purpose: trip.purpose,
          travelDate: trip.travelDate,
          question: q.question,
          userAnswer: answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not review your practice answer.');
      setEvaluations((prev) => ({ ...prev, [q.id]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate answer.');
    } finally {
      setEvaluatingId(null);
    }
  };

  const timedSecondsList = questions
    .map((q) => getSecondsForQuestion(q.id))
    .filter((s) => s > 0);
  const avgSeconds =
    timedSecondsList.length > 0
      ? Math.round(
          timedSecondsList.reduce((sum, s) => sum + s, 0) / timedSecondsList.length
        )
      : null;

  return (
    <div className="space-y-6">
      <section className="clearskies-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#1E3A8A] font-semibold">
              <span>{trip.nationality}</span>
              <span aria-hidden="true">→</span>
              <span>{trip.destination}</span>
              <span aria-hidden="true">·</span>
              <span>{trip.visaCode}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Embassy Interview Practice Coach</h1>
            <p className="text-sm text-[#475569]">
              Most visa interviews last under 3 minutes. Time each practice answer and aim for 15–30 seconds.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleGenerateQuestions}
            className="h-12 px-5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Tailor Questions to My Profile
          </button>
        </div>

        {/* Pacing Overview Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#475569]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#1E293B]">
            <Timer className="w-3.5 h-3.5 text-[#1E3A8A]" />
            Target Answer Pace: <span className="font-mono tabular-nums font-semibold">≤ 00:30</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {timedSecondsList.length}/{questions.length} questions timed
          </span>
          {avgSeconds !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums font-semibold text-[#1E3A8A]">
                Avg: {formatDuration(avgSeconds)}
              </span>
            </>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-[#FEF3C7] border border-amber-200 px-4 py-3 text-sm text-[#92400E]">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, index) => {
          const evalResult = evaluations[q.id];
          const isSampleOpen = Boolean(openSample[q.id]);
          const isEvaluating = evaluatingId === q.id;
          const seconds = getSecondsForQuestion(q.id);
          const isRunning = runningId === q.id;
          const pacing = getPacingLabel(seconds);
          const progressPct = Math.min(100, Math.round((seconds / 45) * 100));

          return (
            <article key={q.id} className="clearskies-card rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-semibold text-[#1E3A8A]">
                    QUESTION 0{index + 1}
                  </span>
                  <h2 className="text-lg font-bold text-[#1E293B]">{q.question}</h2>
                  <p className="text-sm text-[#475569]">
                    <strong className="font-semibold text-[#1E293B]">Why officers ask this:</strong>{' '}
                    {q.whyTheyAsk}
                  </p>
                </div>

                {/* Per-Question Answer Timer */}
                <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 px-3.5 py-2.5 flex items-center gap-3 shrink-0 self-start">
                  <div>
                    <div
                      aria-live="off"
                      className={`text-base font-mono font-bold tabular-nums leading-none ${
                        isRunning ? 'text-[#1E3A8A]' : 'text-[#1E293B]'
                      }`}
                    >
                      {formatDuration(seconds)}
                    </div>
                    <p className={`text-[11px] font-medium mt-1 whitespace-nowrap ${pacing.colorClass}`}>
                      {pacing.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTimer(q.id)}
                      aria-label={isRunning ? 'Pause answer timer' : 'Start answer timer'}
                      className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isRunning
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-amber-200'
                          : 'bg-[#1E3A8A] hover:bg-[#172554] text-white'
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>{seconds > 0 ? 'Resume' : 'Start'}</span>
                        </>
                      )}
                    </button>

                    {seconds > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetTimer(q.id)}
                        aria-label="Reset answer timer"
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#475569] flex items-center justify-center cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtle Pacing Bar while timed */}
              {seconds > 0 && (
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${progressPct}%` }}
                    className={`h-full transition-all ${
                      seconds <= TARGET_CONCISE_SECONDS
                        ? 'bg-[#10B981]'
                        : seconds <= 45
                          ? 'bg-[#F59E0B]'
                          : 'bg-rose-600'
                    }`}
                  />
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSample((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                >
                  <span>{isSampleOpen ? 'Hide Strong Example Answer' : 'View Strong Example Answer'}</span>
                  {isSampleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isSampleOpen && (
                  <div className="mt-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-sm text-[#065F46]">
                    {q.sampleStrongAnswer}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-semibold text-[#475569]">
                  Practice your answer (timer starts automatically when you begin typing, or click Start above to practice aloud):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    rows={2}
                    value={draftAnswers[q.id] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        val.length > 0 &&
                        (elapsedMsById[q.id] ?? 0) === 0 &&
                        runningId === null
                      ) {
                        const now = Date.now();
                        setTickNow(now);
                        setRunningId(q.id);
                        setRunStartedAt(now);
                      }
                      setDraftAnswers((prev) => ({ ...prev, [q.id]: val }));
                    }}
                    placeholder="Type how you would respond at the embassy window..."
                    className="flex-1 p-3 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A]"
                  />
                  <button
                    type="button"
                    disabled={isEvaluating || !(draftAnswers[q.id] ?? '').trim()}
                    onClick={() => handleEvaluate(q)}
                    className="h-12 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start"
                  >
                    {isEvaluating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Get AI Coaching
                  </button>
                </div>

                {evalResult && (
                  <div className="rounded-xl bg-[#F5F3FF] border border-[#E0E7FF] p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono font-semibold text-[#4F46E5]">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>COACHING FEEDBACK</span>
                      </div>
                      {seconds > 0 && (
                        <span className="tabular-nums text-[#475569]">
                          TIME: {formatDuration(seconds)}
                        </span>
                      )}
                    </div>
                    <p>
                      <strong className="text-[#065F46]">What works well:</strong> {evalResult.strengths}
                    </p>
                    <p>
                      <strong className="text-[#92400E]">Watch out for:</strong> {evalResult.watchOutFor}
                    </p>
                    <p>
                      <strong className="text-[#1E3A8A]">Polished phrasing:</strong> {evalResult.suggestedPolish}
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
