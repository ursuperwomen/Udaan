import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Check,
  Plus,
  Bell,
  BellRing,
  BellOff,
  Clock,
  Trash2,
  ArrowRight,
  HelpCircle,
  Calendar,
  ListChecks,
  X,
  Send,
} from 'lucide-react';
import {
  APPLICATION_STAGES,
  COUNTRIES,
  findPortalForDestination,
} from '../data/visaPresets';
import {
  ApplicationStage,
  ReminderItem,
  TrackedApplication,
} from '../types/visa';
import { StatusCalendar } from './StatusCalendar';
import {
  findUpcomingAppointmentAlerts,
  getBrowserNotificationStatus,
  loadNotificationPrefs,
  loadNotifiedEventKeys,
  requestBrowserNotificationPermission,
  saveNotificationPrefs,
  saveNotifiedEventKeys,
  sendBrowserPushNotification,
  StatusNotificationPrefs,
} from '../utils/browserNotifications';

interface StatusTrackerViewProps {
  applications: TrackedApplication[];
  activeDestination: string;
  activeVisaCode: string;
  travelDate?: string;
  processingWindow?: string;
  onAddApplication: (app: TrackedApplication) => void;
  onUpdateStage: (
    appId: string,
    nextStage: ApplicationStage,
    note: string,
    keyDate?: string
  ) => void;
  onDeleteApplication: (appId: string) => void;
  onAddReminder: (appId: string, reminder: ReminderItem) => void;
  onToggleReminder: (appId: string, reminderId: string) => void;
  onDeleteReminder: (appId: string, reminderId: string) => void;
  onAskGuide: (prompt: string) => void;
}

export const StatusTrackerView: React.FC<StatusTrackerViewProps> = ({
  applications,
  activeDestination,
  activeVisaCode,
  travelDate,
  processingWindow,
  onAddApplication,
  onUpdateStage,
  onDeleteApplication,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onAskGuide,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id ?? '');
  const [showNewForm, setShowNewForm] = useState(applications.length === 0);
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');

  // New application form state
  const [refNumber, setRefNumber] = useState('');
  const [destination, setDestination] = useState(activeDestination);
  const [embassyCity, setEmbassyCity] = useState('');
  const [visaType, setVisaType] = useState(activeVisaCode);
  const [submittedDate, setSubmittedDate] = useState(new Date().toISOString().slice(0, 10));
  const [appointmentDate, setAppointmentDate] = useState('');

  // Manual status note state
  const [stageNote, setStageNote] = useState('');
  const [selectedStageInput, setSelectedStageInput] = useState<ApplicationStage>('In Consular Review');
  const [stageKeyDate, setStageKeyDate] = useState('');

  // Reminder form state
  const [remTitle, setRemTitle] = useState('');
  const [remDate, setRemDate] = useState('');
  const [remCategory, setRemCategory] = useState<ReminderItem['category']>('Embassy Follow-Up');

  // Push-style browser notifications state
  const [notifPrefs, setNotifPrefs] = useState<StatusNotificationPrefs>(() =>
    loadNotificationPrefs()
  );
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getBrowserNotificationStatus().permission);
  const [pushBanner, setPushBanner] = useState<{
    id: string;
    title: string;
    body: string;
    deliveredNatively: boolean;
    time: string;
  } | null>(null);

  const activeApp =
    applications.find((a) => a.id === selectedAppId) ?? applications[0] ?? null;

  const firePushAlert = useCallback(
    (title: string, body: string, tag?: string) => {
      const { deliveredNatively } = sendBrowserPushNotification({ title, body, tag });
      setBrowserPermission(getBrowserNotificationStatus().permission);
      const id = `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setPushBanner({
        id,
        title,
        body,
        deliveredNatively,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      });
    },
    []
  );

  useEffect(() => {
    if (!pushBanner) return;
    const timer = window.setTimeout(() => {
      setPushBanner((curr) => (curr?.id === pushBanner.id ? null : curr));
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [pushBanner]);

  const upcomingAlertCandidates = useMemo(
    () => findUpcomingAppointmentAlerts(applications, notifPrefs.leadDays),
    [applications, notifPrefs.leadDays]
  );

  useEffect(() => {
    saveNotificationPrefs(notifPrefs);
  }, [notifPrefs]);

  useEffect(() => {
    if (!notifPrefs.enabled || !notifPrefs.notifyOnAppointments) return;
    if (upcomingAlertCandidates.length === 0) return;

    const notified = loadNotifiedEventKeys();
    const pending = upcomingAlertCandidates.filter((item) => !notified.has(item.key));
    if (pending.length === 0) return;

    const first = pending[0];
    const timingLabel =
      first.diffDays === 0
        ? 'today'
        : first.diffDays === 1
          ? 'tomorrow'
          : `in ${first.diffDays} days`;

    firePushAlert(
      `Upcoming Appointment (${timingLabel})`,
      `${first.referenceNumber} · ${first.title} on ${first.date}.`,
      `udaan-appt-${first.appId}-${first.date}`
    );

    pending.forEach((p) => notified.add(p.key));
    saveNotifiedEventKeys(notified);
  }, [notifPrefs.enabled, notifPrefs.notifyOnAppointments, upcomingAlertCandidates, firePushAlert]);

  const handleToggleBrowserNotifications = async () => {
    if (notifPrefs.enabled) {
      setNotifPrefs((prev) => ({ ...prev, enabled: false }));
      return;
    }

    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    setNotifPrefs((prev) => ({ ...prev, enabled: true }));

    firePushAlert(
      'UDAAN Status Alerts Enabled',
      perm === 'granted'
        ? 'You will receive browser push notifications for status changes and upcoming appointments.'
        : 'Browser pop-ups are restricted in this preview — using in-app push alerts instead.',
      'udaan-alerts-enabled'
    );
  };

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNumber.trim()) return;
    const portal = findPortalForDestination(destination);
    const created: TrackedApplication = {
      id: `app-${Date.now()}`,
      referenceNumber: refNumber.trim().toUpperCase(),
      portalName: portal.portalName,
      portalUrl: portal.portalUrl,
      embassyCity: embassyCity.trim() || `${destination} Consulate`,
      destination,
      visaType: visaType.trim() || portal.defaultVisaCode,
      submittedDate,
      appointmentDate,
      currentStage: 'Submitted',
      lastCheckedAt: new Date().toISOString().slice(0, 10),
      statusHistory: [
        {
          id: `log-${Date.now()}`,
          stage: 'Submitted',
          timestamp: submittedDate || new Date().toISOString().slice(0, 10),
          note: `Registered reference ${refNumber.trim().toUpperCase()} for status tracking.`,
        },
      ],
      reminders: appointmentDate
        ? [
            {
              id: `rem-${Date.now()}`,
              title: `Biometrics / Embassy appointment in ${embassyCity.trim() || destination}`,
              dueDate: appointmentDate,
              category: 'Appointment',
              completed: false,
            },
          ]
        : [],
    };
    onAddApplication(created);
    setSelectedAppId(created.id);
    setRefNumber('');
    setEmbassyCity('');
    setAppointmentDate('');
    setShowNewForm(false);
  };

  const handleStageUpdateWithAlert = (
    app: TrackedApplication,
    nextStage: ApplicationStage,
    note: string,
    keyDate?: string
  ) => {
    onUpdateStage(app.id, nextStage, note, keyDate);
    if (notifPrefs.enabled && notifPrefs.notifyOnStatusUpdates) {
      const keyDateSuffix = keyDate ? ` · Key date: ${keyDate}` : '';
      firePushAlert(
        `${app.referenceNumber}: ${nextStage}`,
        `${note}${keyDateSuffix}`,
        `udaan-stage-${app.id}-${nextStage}`
      );
    }
  };

  const handleLogManualUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp) return;
    handleStageUpdateWithAlert(
      activeApp,
      selectedStageInput,
      stageNote.trim() || `Updated status manually to "${selectedStageInput}".`,
      stageKeyDate || undefined
    );
    setStageNote('');
    setStageKeyDate('');
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApp || !remTitle.trim() || !remDate) return;
    onAddReminder(activeApp.id, {
      id: `rem-${Date.now()}`,
      title: remTitle.trim(),
      dueDate: remDate,
      category: remCategory,
      completed: false,
    });
    setRemTitle('');
    setRemDate('');
  };

  const currentStageIdx = activeApp ? APPLICATION_STAGES.indexOf(activeApp.currentStage) : 0;
  const portalGuidance = activeApp ? findPortalForDestination(activeApp.destination) : null;

  return (
    <div className="space-y-6">
      {/* Header & Application Switcher */}
      <section className="clearskies-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Visa Application Status Tracker</h1>
            <p className="text-sm text-[#475569] mt-0.5">
              Save your embassy reference number, check official government portals, log milestones, and manage deadlines.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewForm((prev) => !prev)}
            className="h-11 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Track Application
          </button>
        </div>

        {/* Saved Applications Tabs */}
        {applications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {applications.map((app) => {
              const isSelected = activeApp?.id === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedAppId(app.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EEF2FF] border-[#1E3A8A] text-[#1E3A8A]'
                      : 'bg-white border-slate-200 text-[#475569] hover:border-slate-300'
                  }`}
                >
                  <span className="font-mono">{app.referenceNumber}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{app.destination}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Browser Push-Style Notification Controls */}
        <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 text-[#1E3A8A]">
                {notifPrefs.enabled ? (
                  <BellRing className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#1E293B]">
                    Push-Style Browser Notifications
                  </p>
                  <span className="text-[11px] font-mono text-[#475569]">
                    {!notifPrefs.enabled
                      ? 'Paused'
                      : browserPermission === 'granted'
                        ? 'Browser push active'
                        : browserPermission === 'denied'
                          ? 'In-app push active (browser blocked)'
                          : 'In-app & browser prompt'}
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-0.5">
                  Get instant alerts when an application stage changes or an interview appointment is coming up.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {notifPrefs.enabled && (
                <button
                  type="button"
                  onClick={() =>
                    firePushAlert(
                      'UDAAN Test Alert',
                      activeApp
                        ? `Tracking ${activeApp.referenceNumber} (${activeApp.currentStage}) for ${activeApp.destination}.`
                        : 'Status and appointment alerts are active.',
                      'udaan-test-alert'
                    )
                  }
                  className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-[#1E3A8A] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Test Alert
                </button>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={notifPrefs.enabled}
                aria-label="Toggle push-style browser notifications"
                onClick={handleToggleBrowserNotifications}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                  notifPrefs.enabled
                    ? 'bg-[#10B981] border-[#10B981]'
                    : 'bg-slate-300 border-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    notifPrefs.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {notifPrefs.enabled && (
            <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-[#1E293B] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyOnStatusUpdates}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({
                        ...prev,
                        notifyOnStatusUpdates: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[#1E3A8A] rounded cursor-pointer"
                  />
                  <span>Status updates</span>
                </label>
                <label className="inline-flex items-center gap-2 text-[#1E293B] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.notifyOnAppointments}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({
                        ...prev,
                        notifyOnAppointments: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[#1E3A8A] rounded cursor-pointer"
                  />
                  <span>Upcoming interviews &amp; appointments</span>
                </label>
              </div>

              {notifPrefs.notifyOnAppointments && (
                <div className="flex items-center gap-2">
                  <span className="text-[#475569]">Lead window:</span>
                  <select
                    value={notifPrefs.leadDays}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({
                        ...prev,
                        leadDays: Number(e.target.value) as 1 | 3 | 7,
                      }))
                    }
                    aria-label="Appointment alert lead time"
                    className="h-8 px-2 rounded-md border border-[#CBD5E1] bg-white text-xs font-mono font-semibold text-[#1E293B] focus:outline-none focus:border-[#1E3A8A]"
                  >
                    <option value={1}>1 day before</option>
                    <option value={3}>3 days before</option>
                    <option value={7}>7 days before</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Application Registration Form */}
        {showNewForm && (
          <form
            onSubmit={handleCreateApplication}
            className="pt-4 border-t border-slate-100 space-y-4"
          >
            <h2 className="text-base font-bold text-[#1E293B]">Register Reference Number</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569]">
                  Application Reference / Confirmation ID
                </label>
                <input
                  type="text"
                  required
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. AA00C4F892 or GWF0841299"
                  className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] font-mono text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569]">Destination Country</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-[#1E3A8A]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569]">Embassy / VAC City</label>
                <input
                  type="text"
                  value={embassyCity}
                  onChange={(e) => setEmbassyCity(e.target.value)}
                  placeholder="e.g. Mumbai Consulate, Manila Embassy"
                  className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569]">Visa Classification</label>
                <input
                  type="text"
                  value={visaType}
                  onChange={(e) => setVisaType(e.target.value)}
                  placeholder="e.g. B1/B2, Schengen-C"
                  className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] font-mono text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569]">Submission Date</label>
                <input
                  type="date"
                  value={submittedDate}
                  onChange={(e) => setSubmittedDate(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569]">
                  Biometrics / Interview Date (Optional)
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] font-mono tabular-nums text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="h-11 px-4 rounded-lg text-sm font-semibold text-[#475569] hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 px-5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-sm font-semibold cursor-pointer"
              >
                Save &amp; Start Tracking
              </button>
            </div>
          </form>
        )}
      </section>

      {activeApp ? (
        <>
          {/* Active Application Milestone Stepper & Portal Lookup */}
          <section className="clearskies-card rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#475569]">
                  <span className="font-semibold text-[#1E3A8A]">{activeApp.referenceNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeApp.visaType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeApp.embassyCity}</span>
                </div>
                <h2 className="text-xl font-bold text-[#1E293B]">
                  Current Stage: {activeApp.currentStage}
                </h2>
                <p className="text-xs text-[#475569] tabular-nums">
                  Submitted {activeApp.submittedDate || '—'} · Last checked {activeApp.lastCheckedAt}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onAskGuide(
                      `My ${activeApp.destination} (${activeApp.visaType}) application is currently at "${activeApp.currentStage}". Explain what happens next in plain English and how long this stage usually takes.`
                    )
                  }
                  className="h-10 px-3.5 rounded-lg bg-[#F5F3FF] hover:bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  What happens next?
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteApplication(activeApp.id)}
                  aria-label="Delete tracked application"
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Stage Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {APPLICATION_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() =>
                      handleStageUpdateWithAlert(
                        activeApp,
                        stage,
                        `Moved milestone to ${stage}.`
                      )
                    }
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#EEF2FF] border-[#1E3A8A] text-[#1E3A8A]'
                        : isCompleted
                          ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                          : 'bg-[#F8FAFC] border-slate-200 text-[#475569] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono font-semibold mb-1">
                      <span>STEP 0{idx + 1}</span>
                      {isCompleted && <Check className="w-3.5 h-3.5 text-[#10B981]" />}
                    </div>
                    <p className="text-xs font-bold leading-snug">{stage}</p>
                  </button>
                );
              })}
            </div>

            {/* Official Government Portal Card */}
            <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-mono font-semibold text-[#1E3A8A]">
                  OFFICIAL GOVERNMENT TRACKER
                </p>
                <p className="text-sm font-bold text-[#1E293B]">{activeApp.portalName}</p>
                {portalGuidance && (
                  <p className="text-xs text-[#475569] max-w-prose">{portalGuidance.instructions}</p>
                )}
              </div>
              <a
                href={activeApp.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-lg bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#1E3A8A] text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Open Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Manual Status Update Form */}
            <form
              onSubmit={handleLogManualUpdate}
              className="pt-4 border-t border-slate-100 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-[#475569]">Update Stage</label>
                  <select
                    value={selectedStageInput}
                    onChange={(e) => setSelectedStageInput(e.target.value as ApplicationStage)}
                    className="w-full h-12 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-[#1E3A8A]"
                  >
                    {APPLICATION_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs font-semibold text-[#475569]">Status Note</label>
                  <input
                    type="text"
                    value={stageNote}
                    onChange={(e) => setStageNote(e.target.value)}
                    placeholder="e.g. Interview Nov 25 or response in 10-14 days"
                    className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-[#475569]">
                    Key Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={stageKeyDate}
                    onChange={(e) => setStageKeyDate(e.target.value)}
                    aria-label="Key date from status update"
                    className="w-full h-12 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] font-mono tabular-nums text-xs focus:outline-none focus:border-[#1E3A8A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-12 px-3 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>Log</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#475569]">
                Dates or response windows mentioned in status notes (e.g. &ldquo;Interview on 2026-11-25&rdquo; or &ldquo;decision in 10-15 days&rdquo;) automatically highlight on the calendar below.
              </p>
            </form>
          </section>

          {/* View Switcher: Calendar View vs Timeline & Reminders */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[#1E3A8A] shadow-xs'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Calendar View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#1E3A8A] shadow-xs'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                Reminders &amp; Status Log
              </button>
            </div>
            <span className="text-xs text-[#475569] font-mono tabular-nums">
              {activeApp.reminders.filter((r) => !r.completed).length} active reminders ·{' '}
              {activeApp.statusHistory.length} status entries
            </span>
          </div>

          {viewMode === 'calendar' && (
            <StatusCalendar
              application={activeApp}
              travelDate={travelDate}
              processingWindow={processingWindow}
              onQuickAddReminder={(dateIso, title, category) =>
                onAddReminder(activeApp.id, {
                  id: `rem-${Date.now()}`,
                  title,
                  dueDate: dateIso,
                  category,
                  completed: false,
                })
              }
              onToggleReminder={(reminderId) => onToggleReminder(activeApp.id, reminderId)}
            />
          )}

          {/* Reminders & Activity History Grid */}
          {viewMode === 'timeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reminders & Deadlines */}
            <section className="clearskies-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#F59E0B]" />
                  <h3 className="text-base font-bold text-[#1E293B]">Reminders &amp; Deadlines</h3>
                </div>
                <span className="text-xs font-mono tabular-nums text-[#475569]">
                  {activeApp.reminders.filter((r) => !r.completed).length} active
                </span>
              </div>

              <div className="space-y-2.5">
                {activeApp.reminders.length === 0 ? (
                  <p className="text-sm text-[#475569] py-2">
                    No reminders yet. Add an appointment or portal follow-up date below.
                  </p>
                ) : (
                  activeApp.reminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/70"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleReminder(activeApp.id, rem.id)}
                        className={`mt-0.5 w-6 h-6 rounded-[6px] shrink-0 flex items-center justify-center border cursor-pointer ${
                          rem.completed
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {rem.completed && <Check className="w-4 h-4 stroke-[2.5]" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            rem.completed ? 'line-through text-slate-400' : 'text-[#1E293B]'
                          }`}
                        >
                          {rem.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#475569] mt-0.5">
                          <span className="font-mono tabular-nums">{rem.dueDate}</span>
                          <span aria-hidden="true">·</span>
                          <span>{rem.category}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteReminder(activeApp.id, rem.id)}
                        aria-label="Remove reminder"
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleCreateReminder} className="pt-3 border-t border-slate-100 space-y-2.5">
                <input
                  type="text"
                  required
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="Add reminder (e.g. Check CEAC status)"
                  className="w-full h-11 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={remDate}
                    onChange={(e) => setRemDate(e.target.value)}
                    className="h-11 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] font-mono tabular-nums text-xs focus:outline-none focus:border-[#1E3A8A]"
                  />
                  <select
                    value={remCategory}
                    onChange={(e) => setRemCategory(e.target.value as ReminderItem['category'])}
                    className="h-11 px-2.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-xs focus:outline-none focus:border-[#1E3A8A]"
                  >
                    <option value="Embassy Follow-Up">Embassy Follow-Up</option>
                    <option value="Appointment">Appointment</option>
                    <option value="Document Expiry">Document Expiry</option>
                    <option value="Travel Prep">Travel Prep</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full h-11 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] text-xs font-semibold cursor-pointer"
                >
                  + Add Reminder
                </button>
              </form>
            </section>

            {/* Timeline Activity Log */}
            <section className="clearskies-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E3A8A]" />
                <h3 className="text-base font-bold text-[#1E293B]">Status Timeline Log</h3>
              </div>

              <div className="space-y-3">
                {[...activeApp.statusHistory].reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/70 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#1E3A8A]">{entry.stage}</span>
                      <span className="font-mono tabular-nums text-[#475569]">{entry.timestamp}</span>
                    </div>
                    <p className="text-sm text-[#475569]">{entry.note}</p>
                    {entry.keyDate && (
                      <p className="text-xs font-mono tabular-nums text-[#4F46E5]">
                        Key date highlighted: {entry.keyDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
          )}
        </>
      ) : (
        <section className="clearskies-card rounded-2xl p-8 text-center space-y-3">
          <p className="text-base font-bold text-[#1E293B]">No tracked applications yet</p>
          <p className="text-sm text-[#475569]">
            Register your reference number above to track embassy stages and set follow-up reminders.
          </p>
        </section>
      )}

      {/* Non-intrusive Push-Style Notification Banner */}
      {pushBanner && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-4 space-y-1.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="w-4 h-4 text-[#10B981] shrink-0" />
              <p className="text-sm font-bold text-[#1E293B] truncate">{pushBanner.title}</p>
            </div>
            <button
              type="button"
              onClick={() => setPushBanner(null)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-slate-400 hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#475569] leading-relaxed">{pushBanner.body}</p>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>
              {pushBanner.deliveredNatively ? 'Delivered via Browser Push' : 'In-App Push Alert'}
            </span>
            <span>{pushBanner.time}</span>
          </div>
        </aside>
      )}
    </div>
  );
};
