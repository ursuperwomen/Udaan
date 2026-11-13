import { TrackedApplication } from '../types/visa';

export interface StatusNotificationPrefs {
  enabled: boolean;
  notifyOnStatusUpdates: boolean;
  notifyOnAppointments: boolean;
  leadDays: 1 | 3 | 7;
}

export interface UpcomingAppointmentAlert {
  key: string;
  appId: string;
  referenceNumber: string;
  destination: string;
  date: string;
  title: string;
  diffDays: number;
}

const PREFS_STORAGE_KEY = 'udaan_status_notifications_v1';
const NOTIFIED_KEYS_STORAGE_KEY = 'udaan_notified_status_events_v1';

const DEFAULT_PREFS: StatusNotificationPrefs = {
  enabled: false,
  notifyOnStatusUpdates: true,
  notifyOnAppointments: true,
  leadDays: 3,
};

export function loadNotificationPrefs(): StatusNotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<StatusNotificationPrefs>;
    return {
      enabled: Boolean(parsed.enabled),
      notifyOnStatusUpdates:
        parsed.notifyOnStatusUpdates !== undefined ? Boolean(parsed.notifyOnStatusUpdates) : true,
      notifyOnAppointments:
        parsed.notifyOnAppointments !== undefined ? Boolean(parsed.notifyOnAppointments) : true,
      leadDays:
        parsed.leadDays === 1 || parsed.leadDays === 3 || parsed.leadDays === 7
          ? parsed.leadDays
          : 3,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationPrefs(prefs: StatusNotificationPrefs): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadNotifiedEventKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEYS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function saveNotifiedEventKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(NOTIFIED_KEYS_STORAGE_KEY, JSON.stringify(Array.from(keys).slice(-100)));
  } catch {
    // Ignore storage errors
  }
}

export function getBrowserNotificationStatus(): {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
} {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function sendBrowserPushNotification(params: {
  title: string;
  body: string;
  tag?: string;
}): { deliveredNatively: boolean } {
  const status = getBrowserNotificationStatus();
  if (!status.supported || status.permission !== 'granted') {
    return { deliveredNatively: false };
  }
  try {
    new Notification(params.title, {
      body: params.body,
      tag: params.tag,
    });
    return { deliveredNatively: true };
  } catch {
    return { deliveredNatively: false };
  }
}

function diffDaysFromToday(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayMs = Date.parse(`${todayIso}T00:00:00Z`);
  const targetMs = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(todayMs) || Number.isNaN(targetMs)) return null;
  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

export function findUpcomingAppointmentAlerts(
  applications: TrackedApplication[],
  leadDays: number
): UpcomingAppointmentAlert[] {
  const alerts: UpcomingAppointmentAlert[] = [];
  const seen = new Set<string>();

  applications.forEach((app) => {
    const pushCandidate = (date: string, title: string) => {
      const diffDays = diffDaysFromToday(date);
      if (diffDays === null || diffDays < 0 || diffDays > leadDays) return;
      const key = `${app.id}|${date}|${title}`;
      if (seen.has(key)) return;
      seen.add(key);
      alerts.push({
        key,
        appId: app.id,
        referenceNumber: app.referenceNumber,
        destination: app.destination,
        date,
        title,
        diffDays,
      });
    };

    if (app.appointmentDate) {
      pushCandidate(
        app.appointmentDate.slice(0, 10),
        `Embassy / Biometrics Appointment (${app.embassyCity})`
      );
    }

    app.statusHistory.forEach((entry) => {
      const hasAppointmentCue = /\b(interview|biometric|biometrics|appointment|vac|vfs)\b/i.test(
        entry.note
      );
      if (entry.keyDate && hasAppointmentCue) {
        const isInterview = /\binterview\b/i.test(entry.note);
        pushCandidate(
          entry.keyDate,
          isInterview ? 'Upcoming Consular Interview' : 'Scheduled Embassy Appointment'
        );
      }

      // Also inspect inline ISO YYYY-MM-DD dates in appointment/interview notes
      if (hasAppointmentCue) {
        for (const m of entry.note.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)) {
          const isInterview = /\binterview\b/i.test(entry.note);
          pushCandidate(
            m[1],
            isInterview ? 'Upcoming Consular Interview' : 'Scheduled Embassy Appointment'
          );
        }
      }
    });

    app.reminders.forEach((rem) => {
      if (!rem.completed && rem.category === 'Appointment') {
        pushCandidate(rem.dueDate.slice(0, 10), rem.title);
      }
    });
  });

  return alerts.sort((a, b) => a.diffDays - b.diffDays);
}
