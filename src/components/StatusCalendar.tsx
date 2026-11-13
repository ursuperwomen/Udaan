import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Plane,
  Bell,
  Plus,
  Sparkles,
} from 'lucide-react';
import { ReminderItem, TrackedApplication } from '../types/visa';

interface StatusCalendarProps {
  application: TrackedApplication;
  travelDate?: string;
  processingWindow?: string;
  onQuickAddReminder: (
    dateIso: string,
    title: string,
    category: ReminderItem['category']
  ) => void;
  onToggleReminder: (reminderId: string) => void;
}

type CalendarEventKind =
  | 'appointment'
  | 'status'
  | 'window-edge'
  | 'reminder'
  | 'departure';

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  kind: CalendarEventKind;
  title: string;
  detail: string;
  completed?: boolean;
  reminderId?: string;
  autoDetected?: boolean;
}

interface ResponseWindowRange {
  start: string;
  end: string;
  label: string;
  resolved: boolean;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toValidIsoDate(year: number, monthZeroBased: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthZeroBased) ||
    !Number.isInteger(day) ||
    monthZeroBased < 0 ||
    monthZeroBased > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const dt = new Date(Date.UTC(year, monthZeroBased, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== monthZeroBased ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return dt.toISOString().slice(0, 10);
}

function extractIsoDatesFromText(text: string, fallbackYear: number): string[] {
  const found = new Set<string>();
  if (!text) return [];

  // 1. YYYY-MM-DD or YYYY/MM/DD
  for (const m of text.matchAll(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g)) {
    const iso = toValidIsoDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (iso) found.add(iso);
  }

  // 2. Month DD, YYYY or Month DD (e.g. "Nov 25, 2026" or "Nov 25")
  const monthNames = Object.keys(MONTH_INDEX).join('|');
  const mdyRegex = new RegExp(
    `\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`,
    'gi'
  );
  for (const m of text.matchAll(mdyRegex)) {
    const monthIdx = MONTH_INDEX[m[1].toLowerCase()];
    const day = Number(m[2]);
    const year = m[3] ? Number(m[3]) : fallbackYear;
    const iso = toValidIsoDate(year, monthIdx, day);
    if (iso) found.add(iso);
  }

  // 3. DD Month YYYY or DD Month (e.g. "25 Nov 2026")
  const dmyRegex = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\.?(?:,?\\s+(20\\d{2}))?\\b`,
    'gi'
  );
  for (const m of text.matchAll(dmyRegex)) {
    const day = Number(m[1]);
    const monthIdx = MONTH_INDEX[m[2].toLowerCase()];
    const year = m[3] ? Number(m[3]) : fallbackYear;
    const iso = toValidIsoDate(year, monthIdx, day);
    if (iso) found.add(iso);
  }

  // 4. MM/DD/YYYY
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g)) {
    const iso = toValidIsoDate(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    if (iso) found.add(iso);
  }

  return Array.from(found).sort();
}

function extractDayRangeFromText(text: string): { minDays: number; maxDays: number } | null {
  if (!text) return null;

  // Range: "10-15 days", "10 to 15 business days", "5–10 working days"
  const rangeMatch = text.match(
    /\b(\d{1,3})\s*(?:-|–|to)\s*(\d{1,3})\s+(?:calendar\s+|working\s+|business\s+)?days?\b/i
  );
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (a > 0 && b >= a && b <= 180) {
      return { minDays: a, maxDays: b };
    }
  }

  // Single day count with expectation cue: "in 14 days", "within 7 working days"
  const singleMatch = text.match(
    /\b(?:in|within|approx(?:\.|imately)?|around|expected(?:\s+in)?)\s+(\d{1,3})\s+(?:calendar\s+|working\s+|business\s+)?days?\b/i
  );
  if (singleMatch) {
    const n = Number(singleMatch[1]);
    if (n > 0 && n <= 180) {
      return { minDays: Math.max(2, Math.floor(n * 0.7)), maxDays: n };
    }
  }

  return null;
}

function isAppointmentText(text: string): boolean {
  return /\b(interview|biometric|biometrics|appointment|vac|vfs\s+visit|consular\s+visit)\b/i.test(
    text
  );
}

function isResponseWindowText(text: string): boolean {
  return /\b(expected|response|decision|dispatch|result|window|passport\s+ready|collection)\b/i.test(
    text
  );
}

function computeResponseWindowRange(
  application: TrackedApplication,
  processingWindow?: string
): ResponseWindowRange | null {
  const resolved =
    application.currentStage === 'Approved' || application.currentStage === 'Passport Ready';

  // Check newest-to-oldest status updates for explicit day range or expected decision date
  const reversedHistory = [...application.statusHistory].reverse();
  for (const entry of reversedHistory) {
    const entryBase = entry.timestamp.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryBase)) continue;

    const noteRange = extractDayRangeFromText(entry.note);
    if (noteRange) {
      return {
        start: addDaysIso(entryBase, noteRange.minDays),
        end: addDaysIso(entryBase, noteRange.maxDays),
        label: resolved
          ? `Decision reached (was ${noteRange.minDays}–${noteRange.maxDays} days from ${entry.stage})`
          : `Expected Response Window (${noteRange.minDays}–${noteRange.maxDays} days from ${entry.stage})`,
        resolved,
      };
    }

    const fallbackYear = Number(entryBase.slice(0, 4)) || new Date().getUTCFullYear();
    const noteDates = [
      ...(entry.keyDate ? [entry.keyDate] : []),
      ...extractIsoDatesFromText(entry.note, fallbackYear),
    ].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d > entryBase);

    if (noteDates.length > 0 && isResponseWindowText(entry.note)) {
      const sorted = Array.from(new Set(noteDates)).sort();
      const targetEnd = sorted[sorted.length - 1];
      const targetStart = sorted.length > 1 ? sorted[0] : addDaysIso(targetEnd, -3);
      return {
        start: targetStart >= entryBase ? targetStart : entryBase,
        end: targetEnd,
        label: resolved
          ? `Decision reached (targeted ${targetEnd})`
          : `Expected Response Window (from ${entry.stage} update)`,
        resolved,
      };
    }
  }

  // Otherwise anchor from most recent Consular Review / Biometrics Done, falling back to submission
  const reviewEntry = [...application.statusHistory]
    .reverse()
    .find((s) => s.stage === 'In Consular Review');
  const biometricsEntry = [...application.statusHistory]
    .reverse()
    .find((s) => s.stage === 'Biometrics Done');

  const anchorEntry = reviewEntry || biometricsEntry;
  const baseDate =
    anchorEntry?.timestamp.slice(0, 10) || application.submittedDate?.slice(0, 10);

  if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return null;

  let minDays = 10;
  let maxDays = 21;

  const lowerDest = application.destination.toLowerCase();
  if (lowerDest.includes('schengen')) {
    minDays = 10;
    maxDays = 15;
  } else if (lowerDest.includes('japan')) {
    minDays = 5;
    maxDays = 10;
  } else if (lowerDest.includes('united states')) {
    minDays = 14;
    maxDays = 35;
  } else if (lowerDest.includes('united kingdom')) {
    minDays = 15;
    maxDays = 21;
  } else if (processingWindow) {
    const nums = processingWindow.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length >= 2) {
      minDays = nums[0];
      maxDays = nums[1];
    } else if (nums.length === 1) {
      minDays = Math.max(3, Math.floor(nums[0] * 0.7));
      maxDays = nums[0];
    }
  }

  const anchorName = reviewEntry
    ? 'consular review'
    : biometricsEntry
      ? 'biometrics'
      : 'submission';

  return {
    start: addDaysIso(baseDate, minDays),
    end: addDaysIso(baseDate, maxDays),
    label: resolved
      ? `Decision Reached (${minDays}–${maxDays} days estimate)`
      : `Expected Response Window (${minDays}–${maxDays} days from ${anchorName})`,
    resolved,
  };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const KIND_STYLES: Record<
  CalendarEventKind,
  { dot: string; badgeBg: string; badgeText: string; shortLabel: string }
> = {
  appointment: {
    dot: 'bg-[#F59E0B]',
    badgeBg: 'bg-[#FEF3C7]',
    badgeText: 'text-[#92400E]',
    shortLabel: 'Appt',
  },
  status: {
    dot: 'bg-[#1E3A8A]',
    badgeBg: 'bg-[#EEF2FF]',
    badgeText: 'text-[#1E3A8A]',
    shortLabel: 'Stage',
  },
  'window-edge': {
    dot: 'bg-[#4F46E5]',
    badgeBg: 'bg-[#F5F3FF]',
    badgeText: 'text-[#4F46E5]',
    shortLabel: 'Window',
  },
  reminder: {
    dot: 'bg-[#F59E0B]',
    badgeBg: 'bg-[#FEF3C7]',
    badgeText: 'text-[#92400E]',
    shortLabel: 'Task',
  },
  departure: {
    dot: 'bg-[#10B981]',
    badgeBg: 'bg-[#ECFDF5]',
    badgeText: 'text-[#065F46]',
    shortLabel: 'Flight',
  },
};

export const StatusCalendar: React.FC<StatusCalendarProps> = ({
  application,
  travelDate,
  processingWindow,
  onQuickAddReminder,
  onToggleReminder,
}) => {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const responseWindow = useMemo(
    () => computeResponseWindowRange(application, processingWindow),
    [application, processingWindow]
  );

  const { events, detectedAppointments } = useMemo(() => {
    const list: CalendarEvent[] = [];
    const autoAppts: Array<{ date: string; label: string }> = [];

    if (application.submittedDate) {
      list.push({
        id: 'ev-submitted',
        date: application.submittedDate.slice(0, 10),
        kind: 'status',
        title: 'Application Submitted',
        detail: `Reference ${application.referenceNumber} logged for ${application.destination}.`,
      });
    }

    if (application.appointmentDate) {
      list.push({
        id: 'ev-appt',
        date: application.appointmentDate.slice(0, 10),
        kind: 'appointment',
        title: 'Biometrics / Embassy Appointment',
        detail: `${application.embassyCity} · Bring original passport and appointment confirmation.`,
      });
    }

    application.statusHistory.forEach((entry) => {
      const dateIso = entry.timestamp.slice(0, 10);
      if (
        !(
          entry.stage === 'Submitted' &&
          application.submittedDate &&
          dateIso === application.submittedDate.slice(0, 10)
        )
      ) {
        list.push({
          id: `ev-hist-${entry.id}`,
          date: dateIso,
          kind: 'status',
          title: `Stage Update: ${entry.stage}`,
          detail: entry.note,
        });
      }

      // Auto-highlight key dates referenced inside status updates or keyDate field
      const fallbackYear = Number(dateIso.slice(0, 4)) || new Date().getUTCFullYear();
      const extractedDates = Array.from(
        new Set([
          ...(entry.keyDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.keyDate) ? [entry.keyDate] : []),
          ...extractIsoDatesFromText(entry.note, fallbackYear),
        ])
      ).filter((d) => d !== dateIso && d !== application.appointmentDate?.slice(0, 10));

      extractedDates.forEach((targetIso, idx) => {
        const apptCue = isAppointmentText(entry.note);
        const windowCue = isResponseWindowText(entry.note);
        const isInterview = /\binterview\b/i.test(entry.note);

        if (apptCue) {
          const title = isInterview
            ? 'Upcoming Interview Appointment'
            : 'Scheduled Appointment (from status)';
          list.push({
            id: `ev-hist-date-${entry.id}-${idx}`,
            date: targetIso,
            kind: 'appointment',
            title,
            detail: `${entry.stage}: ${entry.note}`,
            autoDetected: true,
          });
          autoAppts.push({
            date: targetIso,
            label: isInterview ? 'Interview' : 'Appointment',
          });
        } else if (windowCue) {
          list.push({
            id: `ev-hist-date-${entry.id}-${idx}`,
            date: targetIso,
            kind: 'window-edge',
            title: 'Expected Decision Target (from status)',
            detail: `${entry.stage}: ${entry.note}`,
            autoDetected: true,
          });
        } else {
          list.push({
            id: `ev-hist-date-${entry.id}-${idx}`,
            date: targetIso,
            kind: 'status',
            title: `Key Date (${entry.stage})`,
            detail: entry.note,
            autoDetected: true,
          });
        }
      });
    });

    if (responseWindow) {
      list.push({
        id: 'ev-win-start',
        date: responseWindow.start,
        kind: 'window-edge',
        title: responseWindow.resolved ? 'Decision Window Opened' : 'Response Window Opens',
        detail: responseWindow.label,
        completed: responseWindow.resolved,
      });
      if (responseWindow.end !== responseWindow.start) {
        list.push({
          id: 'ev-win-end',
          date: responseWindow.end,
          kind: 'window-edge',
          title: responseWindow.resolved ? 'Target Window Completed' : 'Expected Decision Target',
          detail: responseWindow.label,
          completed: responseWindow.resolved,
        });
      }
    }

    application.reminders.forEach((rem) => {
      list.push({
        id: `ev-rem-${rem.id}`,
        date: rem.dueDate.slice(0, 10),
        kind: 'reminder',
        title: rem.title,
        detail: `${rem.category} reminder`,
        completed: rem.completed,
        reminderId: rem.id,
      });
    });

    if (travelDate && /^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      list.push({
        id: 'ev-departure',
        date: travelDate,
        kind: 'departure',
        title: 'Planned Departure Date',
        detail: `Target travel departure for ${application.destination}.`,
      });
    }

    return { events: list, detectedAppointments: autoAppts };
  }, [application, responseWindow, travelDate]);

  const initialAnchorDate = useMemo(() => {
    return (
      detectedAppointments[0]?.date ||
      application.appointmentDate ||
      responseWindow?.start ||
      application.submittedDate ||
      todayIso
    ).slice(0, 10);
  }, [
    detectedAppointments,
    application.appointmentDate,
    application.submittedDate,
    responseWindow,
    todayIso,
  ]);

  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const [y, m] = initialAnchorDate.split('-').map(Number);
    return {
      year: y || 2026,
      month: (m || 11) - 1,
    };
  });

  const [selectedDate, setSelectedDate] = useState<string>(initialAnchorDate);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] =
    useState<ReminderItem['category']>('Embassy Follow-Up');

  // Re-center calendar whenever user switches tracked applications
  useEffect(() => {
    const [y, m] = initialAnchorDate.split('-').map(Number);
    if (y && m) {
      setViewMonth({ year: y, month: m - 1 });
      setSelectedDate(initialAnchorDate);
    }
  }, [application.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [events]);

  const monthCells = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewMonth.year, viewMonth.month, 1));
    const startWeekday = firstDay.getUTCDay();
    const daysInMonth = new Date(
      Date.UTC(viewMonth.year, viewMonth.month + 1, 0)
    ).getUTCDate();

    const cells: Array<{ iso: string | null; dayNumber: number | null }> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ iso: null, dayNumber: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const mm = String(viewMonth.month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ iso: `${viewMonth.year}-${mm}-${dd}`, dayNumber: d });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, dayNumber: null });
    }
    return cells;
  }, [viewMonth]);

  const monthLabel = new Date(
    Date.UTC(viewMonth.year, viewMonth.month, 1)
  ).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const shiftMonth = (delta: number) => {
    const dt = new Date(Date.UTC(viewMonth.year, viewMonth.month + delta, 1));
    setViewMonth({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() });
  };

  const jumpToDate = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
    const [y, m] = iso.split('-').map(Number);
    setViewMonth({ year: y, month: m - 1 });
    setSelectedDate(iso);
  };

  const sortedUpcomingDates = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.date))).sort();
  }, [events]);

  const selectedDayEvents = eventsByDate[selectedDate] ?? [];
  const isSelectedInWindow =
    Boolean(responseWindow) &&
    selectedDate >= responseWindow!.start &&
    selectedDate <= responseWindow!.end;

  const handleQuickReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !selectedDate) return;
    onQuickAddReminder(selectedDate, quickTitle.trim(), quickCategory);
    setQuickTitle('');
  };

  return (
    <section className="clearskies-card rounded-2xl p-6 space-y-5">
      {/* Header & Month Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#1E3A8A]" />
            <h3 className="text-lg font-bold text-[#1E293B]">
              Key Dates &amp; Expected Response Calendar
            </h3>
          </div>
          <p className="text-xs text-[#475569] mt-0.5">
            Automatically highlights status updates, interview appointments, reminders, and your estimated embassy decision window.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => jumpToDate(todayIso)}
            className="h-10 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#475569] hover:text-[#1E3A8A] cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-[#1E293B] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[136px] text-center text-sm font-bold text-[#1E293B] tabular-nums">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-[#1E293B] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Jump Key Dates Bar */}
      {sortedUpcomingDates.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#475569] pb-2 border-b border-slate-100">
          <span className="font-semibold text-[#1E293B]">Key Dates:</span>
          {application.submittedDate && (
            <button
              type="button"
              onClick={() => jumpToDate(application.submittedDate.slice(0, 10))}
              className="inline-flex items-center gap-1.5 hover:text-[#1E3A8A] hover:underline cursor-pointer"
            >
              <span className="w-2 h-2 rounded-xs bg-[#1E3A8A]" />
              <span>Submitted</span>
              <span className="font-mono tabular-nums">({application.submittedDate.slice(0, 10)})</span>
            </button>
          )}
          {application.appointmentDate && (
            <button
              type="button"
              onClick={() => jumpToDate(application.appointmentDate.slice(0, 10))}
              className="inline-flex items-center gap-1.5 hover:text-[#92400E] hover:underline cursor-pointer"
            >
              <span className="w-2 h-2 rounded-xs bg-[#F59E0B]" />
              <span>Appointment</span>
              <span className="font-mono tabular-nums">({application.appointmentDate.slice(0, 10)})</span>
            </button>
          )}
          {detectedAppointments.map((appt, index) => (
            <button
              key={`${appt.date}-${index}`}
              type="button"
              onClick={() => jumpToDate(appt.date)}
              className="inline-flex items-center gap-1.5 hover:text-[#92400E] hover:underline cursor-pointer"
            >
              <span className="w-2 h-2 rounded-xs bg-[#F59E0B]" />
              <span>{appt.label}</span>
              <span className="font-mono tabular-nums">({appt.date})</span>
            </button>
          ))}
          {responseWindow && (
            <button
              type="button"
              onClick={() => jumpToDate(responseWindow.start)}
              className={`inline-flex items-center gap-1.5 hover:underline cursor-pointer ${
                responseWindow.resolved ? 'hover:text-[#065F46]' : 'hover:text-[#4F46E5]'
              }`}
            >
              <span
                className={`w-3 h-2 rounded-xs border ${
                  responseWindow.resolved
                    ? 'bg-[#ECFDF5] border-[#10B981]'
                    : 'bg-[#EEF2FF] border-[#4F46E5]'
                }`}
              />
              <span>{responseWindow.resolved ? 'Decision Window' : 'Response Window'}</span>
              <span className="font-mono tabular-nums">
                ({responseWindow.start.slice(5)} to {responseWindow.end.slice(5)})
              </span>
            </button>
          )}
          {travelDate && (
            <button
              type="button"
              onClick={() => jumpToDate(travelDate)}
              className="inline-flex items-center gap-1.5 hover:text-[#065F46] hover:underline cursor-pointer"
            >
              <span className="w-2 h-2 rounded-xs bg-[#10B981]" />
              <span>Departure</span>
              <span className="font-mono tabular-nums">({travelDate})</span>
            </button>
          )}
        </div>
      )}

      {/* 7-Column Month Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-7 bg-[#F8FAFC] border-b border-slate-200">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[11px] font-mono font-semibold text-[#475569]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {monthCells.map((cell, idx) => {
            if (!cell.iso || cell.dayNumber === null) {
              return <div key={`empty-${idx}`} className="min-h-[82px] bg-slate-50/40" />;
            }

            const dayEvents = eventsByDate[cell.iso] ?? [];
            const inResponseWindow =
              Boolean(responseWindow) &&
              cell.iso >= responseWindow!.start &&
              cell.iso <= responseWindow!.end;
            const isSelected = selectedDate === cell.iso;
            const isToday = cell.iso === todayIso;
            const hasAppointment = dayEvents.some((e) => e.kind === 'appointment');

            const cellToneClass = isSelected
              ? 'bg-[#EEF2FF] ring-1 ring-inset ring-[#1E3A8A]'
              : hasAppointment
                ? 'bg-[#FFFBEB] hover:bg-[#FEF3C7]/60'
                : inResponseWindow
                  ? responseWindow?.resolved
                    ? 'bg-[#ECFDF5]/65 hover:bg-[#ECFDF5]'
                    : 'bg-[#F5F3FF]/75 hover:bg-[#EEF2FF]/75'
                  : 'bg-white hover:bg-[#F8FAFC]';

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelectedDate(cell.iso!)}
                className={`min-h-[82px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A8A] ${cellToneClass}`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span
                    className={`text-xs font-mono tabular-nums font-semibold ${
                      isSelected
                        ? 'text-[#1E3A8A]'
                        : isToday
                          ? 'text-[#4F46E5] underline decoration-2 underline-offset-2'
                          : dayEvents.length > 0
                            ? 'text-[#1E293B]'
                            : 'text-slate-500'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                  {isToday && (
                    <span className="hidden sm:inline text-[9px] font-mono font-bold text-[#4F46E5]">
                      TODAY
                    </span>
                  )}
                  {!isToday && inResponseWindow && dayEvents.length === 0 && (
                    <span
                      className={`hidden sm:inline text-[9px] font-mono ${
                        responseWindow?.resolved ? 'text-[#065F46]' : 'text-[#4F46E5]'
                      }`}
                    >
                      {responseWindow?.resolved ? 'DONE' : 'WIN'}
                    </span>
                  )}
                </div>

                {dayEvents.length > 0 && (
                  <div className="space-y-1 mt-1 w-full">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const style = KIND_STYLES[ev.kind];
                      const isInterview =
                        ev.kind === 'appointment' && /\binterview\b/i.test(ev.title);
                      const effectiveStyle =
                        (ev.kind === 'reminder' || ev.kind === 'window-edge') && ev.completed
                          ? {
                              badgeBg: 'bg-[#ECFDF5]',
                              badgeText: 'text-[#065F46]',
                              shortLabel: ev.kind === 'window-edge' ? 'Decided' : 'Done',
                            }
                          : isInterview
                            ? {
                                ...style,
                                shortLabel: 'Interview',
                              }
                            : style;
                      return (
                        <div
                          key={ev.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${effectiveStyle.badgeBg} ${effectiveStyle.badgeText}`}
                        >
                          {effectiveStyle.shortLabel}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] font-mono text-[#475569] px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Inspector */}
      <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-mono font-semibold text-[#1E3A8A]">
              SELECTED DATE · {selectedDate}
              {selectedDate === todayIso ? ' · TODAY' : ''}
            </p>
            <h4 className="text-sm font-bold text-[#1E293B] mt-0.5">
              {selectedDayEvents.length > 0
                ? `${selectedDayEvents.length} scheduled item${selectedDayEvents.length > 1 ? 's' : ''}`
                : isSelectedInWindow
                  ? responseWindow?.resolved
                    ? 'Inside Completed Decision Window'
                    : 'Inside Expected Embassy Response Window'
                  : 'No milestones scheduled on this date'}
            </h4>
          </div>
          {isSelectedInWindow && responseWindow && (
            <span
              className={`text-xs font-medium ${
                responseWindow.resolved ? 'text-[#065F46]' : 'text-[#4F46E5]'
              }`}
            >
              {responseWindow.label}
            </span>
          )}
        </div>

        {selectedDayEvents.length > 0 && (
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-lg border border-slate-200/80 p-3 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 text-[#1E3A8A]">
                    {ev.kind === 'departure' ? (
                      <Plane className="w-4 h-4 text-[#10B981]" />
                    ) : ev.kind === 'reminder' || ev.kind === 'appointment' ? (
                      <Bell className="w-4 h-4 text-[#F59E0B]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#1E3A8A]" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          ev.completed && ev.kind === 'reminder'
                            ? 'line-through text-slate-400'
                            : 'text-[#1E293B]'
                        }`}
                      >
                        {ev.title}
                      </p>
                      {ev.autoDetected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-[#4F46E5]">
                          <Sparkles className="w-3 h-3" />
                          From status update
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">{ev.detail}</p>
                  </div>
                </div>

                {ev.reminderId && (
                  <button
                    type="button"
                    onClick={() => onToggleReminder(ev.reminderId!)}
                    aria-label="Toggle reminder completion"
                    className={`w-6 h-6 rounded-[6px] shrink-0 flex items-center justify-center border cursor-pointer ${
                      ev.completed
                        ? 'bg-[#10B981] border-[#10B981] text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {ev.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Schedule Reminder for Selected Date */}
        <form
          onSubmit={handleQuickReminderSubmit}
          className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={`Add reminder for ${selectedDate}...`}
            className="flex-1 h-11 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-[#1E3A8A]"
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value as ReminderItem['category'])}
            className="h-11 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-xs font-medium focus:outline-none focus:border-[#1E3A8A]"
          >
            <option value="Embassy Follow-Up">Embassy Follow-Up</option>
            <option value="Appointment">Appointment</option>
            <option value="Document Expiry">Document Expiry</option>
            <option value="Travel Prep">Travel Prep</option>
          </select>
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="h-11 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Date
          </button>
        </form>
      </div>
    </section>
  );
};
