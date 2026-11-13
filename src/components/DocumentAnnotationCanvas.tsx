import React, { useRef, useState } from 'react';
import { StickyNote, Eye, EyeOff, Trash2, Check, X, Plus } from 'lucide-react';
import { DocumentAnnotation } from '../types/visa';

interface DocumentAnnotationCanvasProps {
  imageUrl: string;
  fileName: string;
  annotations: DocumentAnnotation[];
  onChangeAnnotations: (next: DocumentAnnotation[]) => void;
}

const TONE_META: Record<
  DocumentAnnotation['tone'],
  {
    label: string;
    pinClass: string;
    noteBg: string;
    noteBorder: string;
    noteText: string;
  }
> = {
  amber: {
    label: 'Highlight',
    pinClass: 'bg-[#F59E0B] text-white border-white',
    noteBg: 'bg-[#FEF3C7]',
    noteBorder: 'border-amber-300',
    noteText: 'text-[#92400E]',
  },
  blue: {
    label: 'Reference',
    pinClass: 'bg-[#1E3A8A] text-white border-white',
    noteBg: 'bg-[#EEF2FF]',
    noteBorder: 'border-indigo-200',
    noteText: 'text-[#1E3A8A]',
  },
  mint: {
    label: 'Verified',
    pinClass: 'bg-[#10B981] text-white border-white',
    noteBg: 'bg-[#ECFDF5]',
    noteBorder: 'border-emerald-200',
    noteText: 'text-[#065F46]',
  },
};

export const DocumentAnnotationCanvas: React.FC<DocumentAnnotationCanvasProps> = ({
  imageUrl,
  fileName,
  annotations,
  onChangeAnnotations,
}) => {
  const [isPlacing, setIsPlacing] = useState(annotations.length === 0);
  const [showPins, setShowPins] = useState(true);
  const [activeTone, setActiveTone] = useState<DocumentAnnotation['tone']>('amber');
  const [pendingPoint, setPendingPoint] = useState<{ xPct: number; yPct: number } | null>(null);
  const [pendingText, setPendingText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(annotations[0]?.id ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);

  const getRelativeCoords = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { xPct: 50, yPct: 50 };
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;
    return {
      xPct: Math.min(95, Math.max(5, Number(rawX.toFixed(1)))),
      yPct: Math.min(95, Math.max(5, Number(rawY.toFixed(1)))),
    };
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacing || draggingId) return;
    if ((e.target as HTMLElement).closest('[data-pin-control="true"]')) return;
    const coords = getRelativeCoords(e.clientX, e.clientY);
    setPendingPoint(coords);
    setPendingText('');
  };

  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPoint || !pendingText.trim()) return;
    const created: DocumentAnnotation = {
      id: `note-${Date.now()}`,
      xPct: pendingPoint.xPct,
      yPct: pendingPoint.yPct,
      note: pendingText.trim(),
      tone: activeTone,
      createdAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
    onChangeAnnotations([...annotations, created]);
    setSelectedId(created.id);
    setPendingPoint(null);
    setPendingText('');
    setIsPlacing(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const { xPct, yPct } = getRelativeCoords(e.clientX, e.clientY);
    onChangeAnnotations(
      annotations.map((ann) => (ann.id === draggingId ? { ...ann, xPct, yPct } : ann))
    );
  };

  const handlePointerUp = () => {
    if (draggingId) setDraggingId(null);
  };

  const handleUpdateNoteText = (id: string, note: string) => {
    onChangeAnnotations(annotations.map((ann) => (ann.id === id ? { ...ann, note } : ann)));
  };

  const handleUpdateNoteTone = (id: string, tone: DocumentAnnotation['tone']) => {
    onChangeAnnotations(annotations.map((ann) => (ann.id === id ? { ...ann, tone } : ann)));
  };

  const handleDeleteNote = (id: string) => {
    onChangeAnnotations(annotations.filter((ann) => ann.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4 space-y-4">
      {/* Annotation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsPlacing((prev) => !prev);
              setPendingPoint(null);
            }}
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlacing
                ? 'bg-[#1E3A8A] text-white'
                : 'bg-white border border-[#CBD5E1] text-[#1E293B] hover:bg-slate-50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {isPlacing ? 'Click Image to Place Note' : 'Add Sticky Note'}
          </button>

          <div className="inline-flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-lg">
            {(['amber', 'blue', 'mint'] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setActiveTone(tone)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeTone === tone
                    ? `${TONE_META[tone].noteBg} ${TONE_META[tone].noteText}`
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                {TONE_META[tone].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-[#475569]">
            {annotations.length} note{annotations.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setShowPins((prev) => !prev)}
            className="h-9 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#475569] inline-flex items-center gap-1.5 cursor-pointer"
          >
            {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPins ? 'Hide Overlay' : 'Show Overlay'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Image Stage */}
      <div className="flex flex-col items-center">
        <div
          ref={stageRef}
          onClick={handleStageClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`relative inline-block max-w-full rounded-xl overflow-hidden border border-slate-300 bg-white select-none ${
            isPlacing ? 'cursor-crosshair ring-2 ring-[#1E3A8A]/25' : ''
          }`}
        >
          <img
            src={imageUrl}
            alt={`Annotated view of ${fileName}`}
            draggable={false}
            className="block max-h-[440px] w-auto max-w-full object-contain"
          />

          {/* Existing Sticky Note Markers & Callouts */}
          {showPins &&
            annotations.map((ann, idx) => {
              const meta = TONE_META[ann.tone];
              const isSelected = selectedId === ann.id;
              return (
                <div
                  key={ann.id}
                  data-pin-control="true"
                  style={{ left: `${ann.xPct}%`, top: `${ann.yPct}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedId(ann.id);
                      setDraggingId(ann.id);
                    }}
                    aria-label={`Sticky note ${idx + 1}: ${ann.note}`}
                    className={`w-7 h-7 rounded-full border-2 shadow-md font-mono text-xs font-bold flex items-center justify-center transition-transform cursor-grab active:cursor-grabbing ${
                      meta.pinClass
                    } ${isSelected ? 'scale-115 ring-2 ring-[#1E3A8A]/40' : 'hover:scale-105'}`}
                  >
                    {idx + 1}
                  </button>

                  {/* Compact Floating Sticky Note on Image */}
                  <div
                    className={`mt-1.5 w-44 rounded-lg border px-2.5 py-1.5 shadow-sm text-[11px] leading-snug pointer-events-none ${
                      meta.noteBg
                    } ${meta.noteBorder} ${meta.noteText} ${
                      isSelected ? 'opacity-100' : 'opacity-90 hidden sm:block'
                    }`}
                  >
                    <p className="font-semibold line-clamp-2">{ann.note}</p>
                  </div>
                </div>
              );
            })}

          {/* Pending New Sticky Note Composer */}
          {pendingPoint && (
            <form
              data-pin-control="true"
              onSubmit={handleSaveNewNote}
              onClick={(e) => e.stopPropagation()}
              style={{
                left: `${Math.min(72, Math.max(28, pendingPoint.xPct))}%`,
                top: `${Math.min(75, Math.max(20, pendingPoint.yPct))}%`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-64 rounded-xl border p-3 shadow-lg space-y-2 ${TONE_META[activeTone].noteBg} ${TONE_META[activeTone].noteBorder}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono font-bold ${TONE_META[activeTone].noteText}`}>
                  NEW STICKY NOTE
                </span>
                <button
                  type="button"
                  onClick={() => setPendingPoint(null)}
                  aria-label="Cancel sticky note"
                  className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
              <textarea
                autoFocus
                rows={2}
                value={pendingText}
                onChange={(e) => setPendingText(e.target.value)}
                placeholder="Write a quick note for this spot..."
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs text-[#1E293B] focus:outline-none focus:border-[#1E3A8A]"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPendingPoint(null)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-white/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pendingText.trim()}
                  className="px-3 py-1 rounded-md bg-[#1E3A8A] text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Pin Note
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Helper Hint */}
      <p className="text-xs text-[#475569] text-center">
        {isPlacing
          ? 'Tap or click anywhere on the document image above to pin a sticky note.'
          : 'Drag any numbered pin on the image to reposition it, or edit sticky notes below.'}
      </p>

      {/* Editable Sticky Notes List */}
      {annotations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200/80">
          {annotations.map((ann, idx) => {
            const meta = TONE_META[ann.tone];
            const isSelected = selectedId === ann.id;
            return (
              <div
                key={ann.id}
                onClick={() => setSelectedId(ann.id)}
                className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 transition-colors ${
                  isSelected
                    ? `${meta.noteBg} ${meta.noteBorder}`
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-mono font-bold flex items-center justify-center ${meta.pinClass}`}
                  >
                    {idx + 1}
                  </span>
                  <select
                    value={ann.tone}
                    onChange={(e) =>
                      handleUpdateNoteTone(ann.id, e.target.value as DocumentAnnotation['tone'])
                    }
                    className="h-8 px-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-[#1E293B]"
                  >
                    <option value="amber">Highlight</option>
                    <option value="blue">Reference</option>
                    <option value="mint">Verified</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={ann.note}
                  onChange={(e) => handleUpdateNoteText(ann.id, e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A]"
                />

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <span className="text-[11px] font-mono tabular-nums text-[#475569]">
                    ({Math.round(ann.xPct)}%, {Math.round(ann.yPct)}%)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(ann.id);
                    }}
                    aria-label={`Delete sticky note ${idx + 1}`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {annotations.length === 0 && !pendingPoint && (
        <div className="flex items-center justify-center gap-2 text-xs text-[#475569] py-1">
          <StickyNote className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>No sticky notes pinned to this image yet.</span>
        </div>
      )}
    </div>
  );
};
