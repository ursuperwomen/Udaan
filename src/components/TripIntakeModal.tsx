import React, { useState } from 'react';
import { X, Download, Upload, RotateCcw, Loader2 } from 'lucide-react';
import { COUNTRIES } from '../data/visaPresets';
import { VisaPurpose } from '../types/visa';

interface TripIntakeModalProps {
  isOpen: boolean;
  initialNationality: string;
  initialDestination: string;
  initialPurpose: VisaPurpose;
  initialTravelDate: string;
  isGenerating: boolean;
  onClose: () => void;
  onGenerateTrip: (params: {
    nationality: string;
    destination: string;
    purpose: VisaPurpose;
    travelDate: string;
  }) => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetWorkspace: () => void;
}

const PURPOSES: VisaPurpose[] = ['Tourism', 'Business', 'Study', 'Work', 'Family Visit'];

export const TripIntakeModal: React.FC<TripIntakeModalProps> = ({
  isOpen,
  initialNationality,
  initialDestination,
  initialPurpose,
  initialTravelDate,
  isGenerating,
  onClose,
  onGenerateTrip,
  onExportBackup,
  onImportBackup,
  onResetWorkspace,
}) => {
  const [nationality, setNationality] = useState(initialNationality);
  const [destination, setDestination] = useState(initialDestination);
  const [purpose, setPurpose] = useState<VisaPurpose>(initialPurpose);
  const [travelDate, setTravelDate] = useState(initialTravelDate);
  const [customNationality, setCustomNationality] = useState('');
  const [customDestination, setCustomDestination] = useState('');

  if (!isOpen) return null;

  const finalNationality = nationality === '__custom__' ? customNationality.trim() || 'India' : nationality;
  const finalDestination = destination === '__custom__' ? customDestination.trim() || 'United States' : destination;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerateTrip({
      nationality: finalNationality,
      destination: finalDestination,
      purpose,
      travelDate,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-modal-title"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-[0_20px_40px_-8px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 id="trip-modal-title" className="text-xl font-bold text-[#1E293B]">
              Plan Your Visa Journey
            </h2>
            <p className="text-sm text-[#475569] mt-0.5">
              Tell us your passport and destination to build a custom step-by-step checklist.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="intake-nationality" className="block text-sm font-semibold text-[#1E293B]">
                Your Passport Nationality
              </label>
              <select
                id="intake-nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__custom__">Other country...</option>
              </select>
              {nationality === '__custom__' && (
                <input
                  type="text"
                  value={customNationality}
                  onChange={(e) => setCustomNationality(e.target.value)}
                  placeholder="Enter passport country"
                  className="mt-2 w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="intake-destination" className="block text-sm font-semibold text-[#1E293B]">
                Destination Country
              </label>
              <select
                id="intake-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__custom__">Other destination...</option>
              </select>
              {destination === '__custom__' && (
                <input
                  type="text"
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  placeholder="Enter destination country"
                  className="mt-2 w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] text-sm focus:outline-none focus:border-[#1E3A8A]"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="intake-purpose" className="block text-sm font-semibold text-[#1E293B]">
                Trip Purpose
              </label>
              <select
                id="intake-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as VisaPurpose)}
                className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15"
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="intake-date" className="block text-sm font-semibold text-[#1E293B]">
                Target Departure Date
              </label>
              <input
                id="intake-date"
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm font-mono tabular-nums text-[#1E293B] focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-lg text-sm font-semibold text-[#475569] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="h-12 px-6 rounded-lg text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-60 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGenerating ? 'Building Checklist...' : 'Generate Personalized Checklist'}
            </button>
          </div>
        </form>

        {/* Backup & Workspace Utilities */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#475569]">Saved automatically in your browser</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportBackup(f);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={onResetWorkspace}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
