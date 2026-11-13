import React, { useState } from 'react';
import {
  Check,
  HelpCircle,
  Upload,
  Plus,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { ChecklistCategory, ChecklistItem, DocumentKind, VisaTrip } from '../types/visa';

interface ChecklistWorkspaceProps {
  trip: VisaTrip;
  isGenerating: boolean;
  generationError: string | null;
  onToggleItem: (itemId: string) => void;
  onAddCustomItem: (item: { title: string; category: ChecklistCategory; plainSummary: string }) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenNewTrip: () => void;
  onAskGuide: (question: string) => void;
  onGoToUpload: (docType?: DocumentKind) => void;
}

const CATEGORIES: ChecklistCategory[] = [
  'Identity & Travel Docs',
  'Official Forms & Fees',
  'Financial Proof',
  'Supporting Evidence',
];

export const ChecklistWorkspace: React.FC<ChecklistWorkspaceProps> = ({
  trip,
  isGenerating,
  generationError,
  onToggleItem,
  onAddCustomItem,
  onRemoveItem,
  onOpenNewTrip,
  onAskGuide,
  onGoToUpload,
}) => {
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [expandedEli10, setExpandedEli10] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistCategory>('Supporting Evidence');
  const [newSummary, setNewSummary] = useState('');
  const [bannerError, setBannerError] = useState(false);

  const totalCount = trip.checklistItems.length;
  const completedCount = trip.checklistItems.filter((i) => i.completed).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const daysUntilTravel = (() => {
    if (!trip.travelDate) return null;
    const target = new Date(trip.travelDate).getTime();
    const now = Date.now();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diff) ? diff : null;
  })();

  const filteredItems = trip.checklistItems.filter((item) => {
    if (filter === 'todo') return !item.completed;
    if (filter === 'done') return item.completed;
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddCustomItem({
      title: newTitle.trim(),
      category: newCategory,
      plainSummary: newSummary.trim() || 'Personal supporting item added to your visa folder.',
    });
    setNewTitle('');
    setNewSummary('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Journey Banner */}
      <section className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-[#1E3A8A] min-h-[190px] flex items-end">
        {!bannerError ? (
          <img
            src="/src/assets/images/embassy_journey_banner_1794549739011.jpg"
            alt={`${trip.destination} international departure lounge`}
            referrerPolicy="no-referrer"
            onError={() => setBannerError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#264191] to-[#0F172A]"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/55 to-slate-900/25"
        />

        <div className="relative z-10 w-full p-6 sm:p-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-200">
              <span>{trip.nationality} Passport</span>
              <span aria-hidden="true">→</span>
              <span>{trip.destination}</span>
              <span aria-hidden="true">·</span>
              <span>{trip.visaCode}</span>
              <span aria-hidden="true">·</span>
              <span>{trip.purpose}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
              {trip.visaName}
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed max-w-prose">
              {trip.validityRule}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewTrip}
            className="h-11 px-4 rounded-lg bg-white/95 hover:bg-white text-[#1E3A8A] text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer self-start sm:self-end"
          >
            Change Route
          </button>
        </div>
      </section>

      {/* Non-blocking API notice if fallback was used */}
      {generationError && (
        <div className="rounded-xl bg-[#FEF3C7] border border-amber-200 px-4 py-3 flex items-start gap-3 text-sm text-[#92400E]">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#D97706]" />
          <div>
            <p className="font-semibold">Loaded verified template checklist</p>
            <p className="text-xs mt-0.5">{generationError}</p>
          </div>
        </div>
      )}

      {/* Flat Single-Elevation Readiness KPI Strip */}
      <section className="clearskies-card rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="pr-2">
          <p className="text-xs text-[#475569] font-medium">Readiness Progress</p>
          <p className="mt-1 text-xl font-bold text-[#1E293B] tabular-nums">
            {completedCount} of {totalCount}{' '}
            <span className="text-sm font-mono font-semibold text-[#10B981]">({progressPct}%)</span>
          </p>
        </div>
        <div className="pt-3 sm:pt-0 sm:pl-4">
          <p className="text-xs text-[#475569] font-medium">Estimated Fee</p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#1E293B]">
            {trip.estimatedFee}
          </p>
        </div>
        <div className="pt-3 sm:pt-0 sm:pl-4">
          <p className="text-xs text-[#475569] font-medium">Processing Window</p>
          <p className="mt-1 text-sm font-semibold text-[#1E293B] leading-snug">
            {trip.processingWindow}
          </p>
        </div>
        <div className="pt-3 sm:pt-0 sm:pl-4">
          <p className="text-xs text-[#475569] font-medium">Target Departure</p>
          <p className="mt-1 text-sm font-mono font-semibold tabular-nums text-[#1E293B]">
            {trip.travelDate || 'Not set'}
          </p>
          {daysUntilTravel !== null && (
            <p className="text-xs text-[#475569] tabular-nums">
              {daysUntilTravel > 0 ? `${daysUntilTravel} days away` : 'Departure passed'}
            </p>
          )}
        </div>
      </section>

      {/* Filter & Custom Item Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg">
          {(
            [
              { id: 'all', label: `All (${totalCount})` },
              { id: 'todo', label: `To Do (${totalCount - completedCount})` },
              { id: 'done', label: `Ready (${completedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-[#1E3A8A] shadow-xs'
                  : 'text-[#475569] hover:text-[#1E293B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="h-10 px-4 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Custom Item
        </button>
      </div>

      {/* Add Custom Checklist Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="clearskies-card rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-[#1E293B]">Add Personal Checklist Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#475569]">Document or Task Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Invitation letter from sister"
                className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#475569]">Section</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ChecklistCategory)}
                className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-[#1E3A8A]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Short Reminder Note</label>
            <input
              type="text"
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Optional note on how to prepare this document"
              className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-10 px-4 rounded-lg text-xs font-semibold text-[#475569] hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] cursor-pointer"
            >
              Save to Checklist
            </button>
          </div>
        </form>
      )}

      {/* Loading Skeleton when Generating New Checklist */}
      {isGenerating && (
        <div className="clearskies-card rounded-2xl p-6 flex items-center gap-3 text-sm text-[#1E3A8A] font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Customizing requirements for {trip.nationality} → {trip.destination}...</span>
        </div>
      )}

      {/* Categorized Checklist Cards */}
      {filteredItems.length === 0 ? (
        <div className="clearskies-card rounded-2xl p-8 text-center space-y-2">
          <p className="text-base font-semibold text-[#1E293B]">Nothing matching this filter</p>
          <p className="text-sm text-[#475569]">
            Switch back to All items or add a custom task above.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {CATEGORIES.map((category) => {
            const groupItems = filteredItems.filter((item) => item.category === category);
            if (groupItems.length === 0) return null;

            const groupDone = groupItems.filter((i) => i.completed).length;

            return (
              <section key={category} className="space-y-3">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-base font-bold text-[#1E293B]">{category}</h2>
                  <span className="text-xs font-mono tabular-nums text-[#475569]">
                    {groupDone}/{groupItems.length} complete
                  </span>
                </div>

                <div className="space-y-2.5">
                  {groupItems.map((item: ChecklistItem) => {
                    const isExpanded = Boolean(expandedEli10[item.id]);
                    return (
                      <article
                        key={item.id}
                        className={`clearskies-card rounded-xl p-5 transition-colors ${
                          item.completed ? 'bg-slate-50/70' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Custom 24px Rounded Square Checkbox */}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={item.completed}
                            aria-label={`Mark ${item.title} as ${item.completed ? 'incomplete' : 'complete'}`}
                            onClick={() => onToggleItem(item.id)}
                            className={`mt-0.5 w-6 h-6 rounded-[6px] shrink-0 flex items-center justify-center border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1E3A8A]/20 ${
                              item.completed
                                ? 'bg-[#10B981] border-[#10B981] text-white'
                                : 'bg-white border-slate-300 hover:border-[#1E3A8A]'
                            }`}
                          >
                            {item.completed && <Check className="w-4 h-4 stroke-[2.5]" />}
                          </button>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="space-y-1">
                                <h3
                                  className={`text-base font-semibold leading-snug ${
                                    item.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-[#1E293B]'
                                  }`}
                                >
                                  {item.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                                  {item.formCode && (
                                    <span className="font-mono font-semibold text-[#1E3A8A]">
                                      {item.formCode}
                                    </span>
                                  )}
                                  {item.formCode && <span aria-hidden="true">·</span>}
                                  <span>{item.required ? 'Required' : 'Optional'}</span>
                                  {item.estimatedCost && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono tabular-nums">{item.estimatedCost}</span>
                                    </>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={`font-medium ${
                                      item.completed ? 'text-[#065F46]' : 'text-[#92400E]'
                                    }`}
                                  >
                                    {item.completed ? 'Ready' : 'Action needed'}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                aria-label={`Remove ${item.title}`}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <p className="text-sm text-[#475569] leading-relaxed max-w-prose">
                              {item.plainSummary}
                            </p>

                            {/* Action Triggers */}
                            <div className="pt-1 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedEli10((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                  }))
                                }
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Explain Like I&apos;m 10</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {item.linkedDocType && (
                                <button
                                  type="button"
                                  onClick={() => onGoToUpload(item.linkedDocType)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Scan &amp; Pre-Fill Document</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  onAskGuide(
                                    `Explain "${item.title}" for a ${trip.nationality} citizen going to ${trip.destination} (${trip.purpose}) and common mistakes to avoid.`
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#1E293B] hover:underline cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Ask Guide</span>
                              </button>
                            </div>

                            {/* Plain-English "Explain Like I'm 10" Drawer */}
                            {isExpanded && (
                              <div className="mt-2 rounded-xl bg-[#F5F3FF] border border-[#E0E7FF] p-4 text-sm text-[#1E293B] leading-relaxed">
                                <p className="text-xs font-mono font-semibold text-[#4F46E5] mb-1">
                                  IN PLAIN WORDS
                                </p>
                                <p>{item.eli10Explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
