import React, { useMemo, useRef, useState } from 'react';
import {
  UploadCloud,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Copy,
  Check,
  Trash2,
  FileDown,
  StickyNote,
  BellRing,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import {
  ApplicantProfile,
  DocumentAnnotation,
  DocumentKind,
  ExtractedDocumentFields,
  UploadedDocument,
  VisaTrip,
} from '../types/visa';
import { exportCompiledProfilePdf } from '../utils/exportProfilePdf';
import { DocumentAnnotationCanvas } from './DocumentAnnotationCanvas';

interface DocumentVaultViewProps {
  documents: UploadedDocument[];
  profile: ApplicantProfile;
  trip: VisaTrip;
  initialDocType?: DocumentKind;
  onAddDocument: (doc: UploadedDocument) => void;
  onUpdateDocumentFields: (docId: string, fields: ExtractedDocumentFields) => void;
  onUpdateConfirmedFields: (
    docId: string,
    confirmedFields: Array<keyof ExtractedDocumentFields>
  ) => void;
  onUpdateDocumentAnnotations: (docId: string, annotations: DocumentAnnotation[]) => void;
  onApplyToProfile: (docId: string) => void;
  onRemoveDocument: (docId: string) => void;
  onUpdateProfile: (next: ApplicantProfile) => void;
  onNotify?: (message: string) => void;
}

const DOC_TYPE_OPTIONS: Array<{ value: DocumentKind | 'auto'; label: string }> = [
  { value: 'auto', label: 'Auto-Detect Document Type' },
  { value: 'passport', label: 'Passport Bio Page' },
  { value: 'financial', label: 'Bank / Financial Statement' },
  { value: 'itinerary', label: 'Flight or Hotel Itinerary' },
  { value: 'employment', label: 'Employment / Enrollment Letter' },
  { value: 'photo', label: 'Visa Portrait Photo' },
];

const DOC_KIND_LABELS: Record<DocumentKind, string> = {
  passport: 'Passport Bio Page',
  financial: 'Bank / Financial Statement',
  itinerary: 'Flight or Hotel Itinerary',
  employment: 'Employment / Enrollment Letter',
  photo: 'Visa Portrait Photo',
};

const FIELD_LABELS: Array<{ key: keyof ExtractedDocumentFields; label: string }> = [
  { key: 'fullName', label: 'Full Legal Name' },
  { key: 'passportNumber', label: 'Passport Number' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'expiryDate', label: 'Passport Expiry Date' },
  { key: 'issuingCountry', label: 'Issuing Country' },
  { key: 'accountHolder', label: 'Account Holder' },
  { key: 'bankName', label: 'Bank / Institution' },
  { key: 'endingBalance', label: 'Ending Balance' },
  { key: 'currency', label: 'Currency' },
  { key: 'statementPeriod', label: 'Statement Period' },
  { key: 'employerName', label: 'Employer / School' },
  { key: 'jobTitle', label: 'Role / Program' },
  { key: 'flightOrBookingRef', label: 'Booking Reference' },
  { key: 'travelDates', label: 'Travel Dates' },
  { key: 'destinationCity', label: 'Destination City' },
];

interface DocFieldProgress {
  populatedKeys: Array<{ key: keyof ExtractedDocumentFields; label: string }>;
  confirmedSet: Set<keyof ExtractedDocumentFields>;
  confirmedCount: number;
  totalCount: number;
  pct: number;
  readyForApplication: boolean;
}

interface SmartReminderItem {
  id: string;
  severity: 'amber' | 'indigo' | 'mint';
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}

function getDocumentFieldProgress(doc: UploadedDocument): DocFieldProgress {
  const populatedKeys = FIELD_LABELS.filter(({ key }) =>
    Boolean(doc.extractedFields[key]?.trim())
  );
  const confirmedSet = new Set<keyof ExtractedDocumentFields>();

  if (Array.isArray(doc.confirmedFields)) {
    doc.confirmedFields.forEach((key) => {
      if (doc.extractedFields[key]?.trim()) {
        confirmedSet.add(key);
      }
    });
  } else if (doc.appliedToProfile) {
    populatedKeys.forEach(({ key }) => confirmedSet.add(key));
  }

  const totalCount = populatedKeys.length;
  const confirmedCount = confirmedSet.size;
  const pct =
    totalCount > 0
      ? Math.round((confirmedCount / totalCount) * 100)
      : doc.appliedToProfile
        ? 100
        : 0;
  const readyForApplication =
    doc.appliedToProfile && (totalCount === 0 || confirmedCount === totalCount);

  return {
    populatedKeys,
    confirmedSet,
    confirmedCount,
    totalCount,
    pct,
    readyForApplication,
  };
}

function getMonthsBetween(startIso?: string, endIso?: string): number | null {
  if (!endIso) return null;
  const endMs = Date.parse(endIso);
  if (Number.isNaN(endMs)) return null;
  const startMs = startIso && !Number.isNaN(Date.parse(startIso)) ? Date.parse(startIso) : Date.now();
  const diffDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
  return Math.round((diffDays / 30.4375) * 10) / 10;
}

function getPerDocumentSmartReminders(
  doc: UploadedDocument,
  progress: DocFieldProgress,
  trip: VisaTrip
): string[] {
  const notes: string[] = [];

  if (progress.totalCount > 0 && progress.confirmedCount < progress.totalCount) {
    const remaining = progress.totalCount - progress.confirmedCount;
    notes.push(
      `${remaining} extracted field${remaining > 1 ? 's' : ''} still need confirmation before applying to your form.`
    );
  } else if (progress.totalCount > 0 && !doc.appliedToProfile) {
    notes.push(
      `All ${progress.totalCount} fields are confirmed — click "Apply to Application Form" to mark this document ready.`
    );
  }

  if (doc.docType === 'passport') {
    const expiry = doc.extractedFields.expiryDate?.trim();
    if (!expiry) {
      notes.push('Confirm your passport expiry date to verify the 6-month travel validity rule.');
    } else {
      const months = getMonthsBetween(trip.travelDate, expiry);
      if (months !== null && months < 6) {
        notes.push(
          months <= 0
            ? `Passport expires (${expiry}) on or before your planned ${trip.travelDate} departure — renew before applying.`
            : `Passport has ~${months} months validity past ${trip.travelDate}. Most embassies require 6+ months.`
        );
      }
    }
  }

  if (doc.docType === 'financial') {
    if (!doc.extractedFields.endingBalance?.trim() || !doc.extractedFields.statementPeriod?.trim()) {
      notes.push('Make sure ending balance and 3–6 month statement period are filled and confirmed.');
    }
  }

  if (doc.docType === 'itinerary' && trip.travelDate && !doc.extractedFields.travelDates?.trim()) {
    notes.push(`Verify booking travel dates match your planned ${trip.travelDate} departure.`);
  }

  return notes;
}

async function compressImageToBase64(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please upload an image file (JPG, PNG, or WebP) for AI extraction.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const base64 = dataUrl.split(',')[1] || '';
          resolve({ base64, mimeType: file.type || 'image/jpeg', dataUrl });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.86);
        const base64 = compressedUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg', dataUrl: compressedUrl });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const DocumentVaultView: React.FC<DocumentVaultViewProps> = ({
  documents,
  profile,
  trip,
  initialDocType,
  onAddDocument,
  onUpdateDocumentFields,
  onUpdateConfirmedFields,
  onUpdateDocumentAnnotations,
  onApplyToProfile,
  onRemoveDocument,
  onUpdateProfile,
  onNotify,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<DocumentKind | 'auto'>(initialDocType ?? 'auto');
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [illustrationError, setIllustrationError] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [exportedPdf, setExportedPdf] = useState(false);
  const [annotatingDocId, setAnnotatingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setScanError(null);
    setIsScanning(true);
    try {
      const { base64, mimeType, dataUrl } = await compressImageToBase64(file);
      const res = await fetch('/api/visa/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: base64,
          mimeType,
          docType: selectedDocType,
          fileName: file.name,
          travelDate: trip.travelDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not extract fields from this image.');
      }

      const detected = (data.detectedDocType || (selectedDocType === 'auto' ? 'passport' : selectedDocType)) as DocumentKind;
      const newDoc: UploadedDocument = {
        id: `doc-${Date.now()}`,
        docType: detected,
        fileName: file.name,
        mimeType,
        uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        previewDataUrl: dataUrl,
        summary: data.summary || 'Document scanned and ready for review.',
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        extractedFields: data.extractedFields || {},
        confirmedFields: [],
        appliedToProfile: false,
      };
      onAddDocument(newDoc);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to analyze document image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleCopyProfile = async () => {
    const text = [
      `UDAAN — Pre-Filled Application Summary`,
      `Full Name: ${profile.fullName || '—'}`,
      `Nationality: ${profile.nationality || '—'}`,
      `Date of Birth: ${profile.dateOfBirth || '—'}`,
      `Passport Number: ${profile.passportNumber || '—'}`,
      `Passport Expiry: ${profile.passportExpiry || '—'}`,
      `Issuing Country: ${profile.issuingCountry || '—'}`,
      `Employer / School: ${profile.employerName || '—'} (${profile.jobTitle || '—'})`,
      `Financial Balance: ${profile.bankBalance ? `${profile.currency} ${profile.bankBalance}` : '—'}`,
      `Booking Reference: ${profile.bookingReference || '—'}`,
      `Intended Travel Dates: ${profile.intendedTravelDates || '—'}`,
      `Home Address: ${profile.homeAddress || '—'}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleExportPdf = () => {
    const fileName = exportCompiledProfilePdf({
      profile,
      documents,
      trip,
    });
    setExportedPdf(true);
    setTimeout(() => setExportedPdf(false), 2400);
    onNotify?.(`Downloaded formatted dossier (${fileName})`);
  };

  // Vault-wide progress and smart reminders
  const vaultSummary = useMemo(() => {
    let totalExtracted = 0;
    let totalConfirmed = 0;
    let readyDocs = 0;

    const docEntries = documents.map((doc) => {
      const progress = getDocumentFieldProgress(doc);
      totalExtracted += progress.totalCount;
      totalConfirmed += progress.confirmedCount;
      if (progress.readyForApplication) readyDocs += 1;
      return { doc, progress };
    });

    const overallPct =
      totalExtracted > 0
        ? Math.round((totalConfirmed / totalExtracted) * 100)
        : documents.length > 0 && readyDocs === documents.length
          ? 100
          : 0;

    const reminders: SmartReminderItem[] = [];

    // 1. Check unconfirmed fields & unapplied documents
    docEntries.forEach(({ doc, progress }) => {
      if (progress.totalCount > 0 && progress.confirmedCount < progress.totalCount) {
        const remaining = progress.totalCount - progress.confirmedCount;
        reminders.push({
          id: `rem-confirm-${doc.id}`,
          severity: 'amber',
          title: `Confirm ${remaining} extracted field${remaining > 1 ? 's' : ''} in ${doc.fileName}`,
          detail: `${progress.confirmedCount}/${progress.totalCount} fields verified. Review OCR values so your application dossier stays accurate.`,
          actionLabel: 'Confirm All',
          onAction: () => {
            onUpdateConfirmedFields(
              doc.id,
              progress.populatedKeys.map((k) => k.key)
            );
            onNotify?.(`Confirmed all ${progress.totalCount} fields in ${doc.fileName}`);
          },
        });
      } else if (progress.totalCount > 0 && !doc.appliedToProfile) {
        reminders.push({
          id: `rem-apply-${doc.id}`,
          severity: 'indigo',
          title: `Apply ${doc.fileName} to your application form`,
          detail: `All ${progress.totalCount} extracted fields are confirmed and ready to sync into your profile.`,
          actionLabel: 'Apply to Form',
          onAction: () => onApplyToProfile(doc.id),
        });
      }

      if (doc.warnings.length > 0) {
        reminders.push({
          id: `rem-warn-${doc.id}`,
          severity: 'amber',
          title: `${doc.warnings.length} compliance check${doc.warnings.length > 1 ? 's' : ''} flagged in ${doc.fileName}`,
          detail: doc.warnings[0],
        });
      }
    });

    // 2. Passport 6-month validity reminder
    const passportExpiry =
      documents.find((d) => d.docType === 'passport')?.extractedFields.expiryDate?.trim() ||
      profile.passportExpiry?.trim();
    if (passportExpiry && trip.travelDate) {
      const months = getMonthsBetween(trip.travelDate, passportExpiry);
      if (months !== null && months < 6) {
        reminders.push({
          id: 'rem-passport-6m',
          severity: 'amber',
          title: 'Passport 6-month validity alert',
          detail:
            months <= 0
              ? `Passport expires (${passportExpiry}) before or on your ${trip.travelDate} departure.`
              : `Only ~${months} months left after ${trip.travelDate}. Most ${trip.destination} visas require 6+ months validity.`,
        });
      }
    }

    // 3. Missing required checklist document categories
    const uploadedTypes = new Set(documents.map((d) => d.docType));
    const missingRequiredKinds = Array.from(
      new Set(
        trip.checklistItems
          .filter((item) => item.required && item.linkedDocType && !uploadedTypes.has(item.linkedDocType))
          .map((item) => item.linkedDocType!)
      )
    );

    missingRequiredKinds.slice(0, 3).forEach((kind) => {
      reminders.push({
        id: `rem-missing-${kind}`,
        severity: 'indigo',
        title: `Missing required document: ${DOC_KIND_LABELS[kind]}`,
        detail: `Required for your ${trip.destination} (${trip.visaCode}) checklist. Upload an image to extract & pre-fill fields.`,
        actionLabel: 'Upload',
        onAction: () => {
          setSelectedDocType(kind);
          fileInputRef.current?.click();
        },
      });
    });

    if (
      reminders.length === 0 &&
      documents.length > 0 &&
      readyDocs === documents.length
    ) {
      reminders.push({
        id: 'rem-all-ready',
        severity: 'mint',
        title: 'All scanned documents confirmed & synced',
        detail: `${totalConfirmed} extracted fields across ${documents.length} document${documents.length > 1 ? 's' : ''} are verified and ready for your visa application.`,
      });
    }

    return {
      docEntries,
      totalExtracted,
      totalConfirmed,
      readyDocs,
      overallPct,
      reminders,
    };
  }, [documents, profile.passportExpiry, trip, onApplyToProfile, onNotify, onUpdateConfirmedFields]);

  const handleToggleFieldConfirmed = (
    doc: UploadedDocument,
    progress: DocFieldProgress,
    fieldKey: keyof ExtractedDocumentFields
  ) => {
    const next = new Set(progress.confirmedSet);
    if (next.has(fieldKey)) {
      next.delete(fieldKey);
    } else {
      next.add(fieldKey);
    }
    onUpdateConfirmedFields(doc.id, Array.from(next));
  };

  return (
    <div className="space-y-8">
      {/* Section 1: AI Document Upload & OCR Dropzone */}
      <section className="clearskies-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Scan &amp; Extract Visa Documents</h1>
            <p className="text-sm text-[#475569] mt-1">
              Upload photos of your passport, bank statement, or booking confirmation to auto-fill your application forms.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="text-xs font-mono font-semibold text-[#1E3A8A]">
              AI-DOC-SCANNER
            </span>
            <button
              type="button"
              onClick={handleExportPdf}
              className="h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {exportedPdf ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
              {exportedPdf ? 'PDF Downloaded' : 'Export Printer-Friendly PDF'}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="doc-type-select" className="text-xs font-semibold text-[#475569] shrink-0">
            Document Category:
          </label>
          <select
            id="doc-type-select"
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value as DocumentKind | 'auto')}
            className="h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A]"
          >
            {DOC_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tactile Dashed Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-colors flex flex-col md:flex-row items-center gap-6 ${
            isDragging
              ? 'border-[#1E3A8A] bg-[#EEF2FF]/50'
              : 'border-[#94A3B8] bg-[#F8FAFC]'
          }`}
        >
          <div className="w-40 h-28 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white flex items-center justify-center">
            {!illustrationError ? (
              <img
                src="/src/assets/images/passport_dropzone_illustration_1794549737576.jpg"
                alt="Passport and travel itinerary illustration"
                referrerPolicy="no-referrer"
                onError={() => setIllustrationError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileText className="w-10 h-10 text-[#1E3A8A]" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div>
              <p className="text-base font-bold text-[#1E293B]">
                Drop passport photo or bank statement here, or take a picture
              </p>
              <p className="text-xs text-[#475569] mt-1">
                Supports JPG, PNG, and WebP images. Fields are extracted securely for your review before saving.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                type="button"
                disabled={isScanning}
                onClick={() => fileInputRef.current?.click()}
                className="h-12 px-5 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                {isScanning ? 'Reading Document...' : 'Choose Image File'}
              </button>

              <button
                type="button"
                disabled={isScanning}
                onClick={() => cameraInputRef.current?.click()}
                className="h-12 px-4 rounded-lg bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#1E293B] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#1E3A8A]" />
                Take Photo
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
                e.target.value = '';
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {scanError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}
      </section>

      {/* Vault Readiness Progress & Smart Reminders */}
      <section className="clearskies-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#1E3A8A]" />
              <h2 className="text-lg font-bold text-[#1E293B]">
                Vault Field Readiness &amp; Smart Reminders
              </h2>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">
              Confirm extracted document values to track application readiness per document and clear smart reminders.
            </p>
          </div>
          <div className="text-left sm:text-right font-mono tabular-nums shrink-0">
            <p className="text-sm font-bold text-[#1E293B]">
              {documents.length > 0
                ? `${vaultSummary.totalConfirmed} / ${vaultSummary.totalExtracted} fields confirmed`
                : '0 documents scanned'}
            </p>
            <p className="text-xs text-[#475569]">
              {documents.length > 0
                ? `${vaultSummary.readyDocs} of ${documents.length} docs ready for application (${vaultSummary.overallPct}%)`
                : 'Upload your first document above'}
            </p>
          </div>
        </div>

        {/* Overall Vault Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                vaultSummary.overallPct === 100 && documents.length > 0
                  ? 'bg-[#10B981]'
                  : 'bg-[#1E3A8A]'
              }`}
              style={{ width: `${vaultSummary.overallPct}%` }}
              role="progressbar"
              aria-valuenow={vaultSummary.overallPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall confirmed extracted fields across document vault"
            />
          </div>
          {documents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#475569]">
              <span>
                {vaultSummary.overallPct === 100
                  ? 'All extracted fields confirmed'
                  : `${vaultSummary.totalExtracted - vaultSummary.totalConfirmed} extracted field${
                      vaultSummary.totalExtracted - vaultSummary.totalConfirmed === 1 ? '' : 's'
                    } awaiting confirmation`}
              </span>
              <span className="font-mono tabular-nums font-semibold text-[#1E3A8A]">
                {vaultSummary.overallPct}% confirmed
              </span>
            </div>
          )}
        </div>

        {/* Smart Reminders List */}
        {vaultSummary.reminders.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <p className="text-xs font-mono font-semibold text-[#475569]">
              SMART REMINDERS ({vaultSummary.reminders.length})
            </p>
            <div className="space-y-2">
              {vaultSummary.reminders.map((rem) => {
                const toneClasses =
                  rem.severity === 'amber'
                    ? 'bg-[#FEF3C7]/60 border-amber-200 text-[#92400E]'
                    : rem.severity === 'mint'
                      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                      : 'bg-[#F8FAFC] border-slate-200 text-[#1E293B]';
                return (
                  <div
                    key={rem.id}
                    className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${toneClasses}`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {rem.severity === 'amber' ? (
                          <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                        ) : rem.severity === 'mint' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{rem.title}</p>
                        <p className="text-xs opacity-85 mt-0.5">{rem.detail}</p>
                      </div>
                    </div>

                    {rem.actionLabel && rem.onAction && (
                      <button
                        type="button"
                        onClick={rem.onAction}
                        className="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[#1E3A8A] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {rem.actionLabel}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Extracted Document Review Cards */}
      {documents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-lg font-bold text-[#1E293B]">Scanned Documents</h2>
            <span className="text-xs font-mono tabular-nums text-[#475569]">
              {documents.length} uploaded · {vaultSummary.readyDocs} ready
            </span>
          </div>

          <div className="space-y-4">
            {vaultSummary.docEntries.map(({ doc, progress }) => {
              const annotations = doc.annotations ?? [];
              const isAnnotating = annotatingDocId === doc.id;
              const docReminders = getPerDocumentSmartReminders(doc, progress, trip);
              const allConfirmed =
                progress.totalCount > 0 && progress.confirmedCount === progress.totalCount;

              return (
                <article key={doc.id} className="clearskies-card rounded-2xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setAnnotatingDocId((curr) => (curr === doc.id ? null : doc.id))
                        }
                        title="Click to open image and add sticky notes"
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 hover:ring-2 hover:ring-[#1E3A8A]/35 transition-all cursor-pointer"
                      >
                        <img
                          src={doc.previewDataUrl}
                          alt={doc.fileName}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-[#1E293B]">{doc.fileName}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                          <span className="font-mono uppercase text-[#1E3A8A] font-semibold">
                            {doc.docType}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{doc.uploadedAt}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              progress.readyForApplication
                                ? 'text-[#065F46]'
                                : allConfirmed
                                  ? 'text-[#4F46E5]'
                                  : 'text-[#92400E]'
                            }`}
                          >
                            {progress.readyForApplication
                              ? 'Confirmed & ready for application'
                              : allConfirmed
                                ? 'Confirmed · Ready to apply'
                                : 'Needs field confirmation'}
                          </span>
                        </div>
                        <p className="text-sm text-[#475569] leading-relaxed pt-1">{doc.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setAnnotatingDocId((curr) => (curr === doc.id ? null : doc.id))
                        }
                        className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap cursor-pointer ${
                          isAnnotating
                            ? 'bg-[#FEF3C7] border-amber-300 text-[#92400E]'
                            : 'bg-white border-slate-200 text-[#1E293B] hover:bg-slate-50'
                        }`}
                      >
                        <StickyNote className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>
                          {isAnnotating
                            ? 'Close Notes'
                            : annotations.length > 0
                              ? `Sticky Notes (${annotations.length})`
                              : 'Annotate Image'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveDocument(doc.id)}
                        aria-label={`Delete ${doc.fileName}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Per-Document Field Confirmation Progress Bar */}
                  <div className="rounded-xl bg-[#F8FAFC] border border-slate-200/80 p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#1E293B]">
                          Extracted Fields Confirmed
                        </span>
                        <span className="text-xs font-mono tabular-nums font-bold text-[#1E3A8A]">
                          {progress.totalCount > 0
                            ? `${progress.confirmedCount} / ${progress.totalCount} (${progress.pct}%)`
                            : doc.appliedToProfile
                              ? 'Ready (100%)'
                              : '0 fields'}
                        </span>
                      </div>

                      {progress.totalCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateConfirmedFields(
                              doc.id,
                              allConfirmed ? [] : progress.populatedKeys.map((k) => k.key)
                            )
                          }
                          className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                            allConfirmed
                              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                              : 'bg-white border-[#CBD5E1] text-[#1E3A8A] hover:bg-[#EEF2FF]'
                          }`}
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          {allConfirmed ? 'All Confirmed' : 'Confirm All Fields'}
                        </button>
                      )}
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progress.pct === 100 ? 'bg-[#10B981]' : 'bg-[#1E3A8A]'
                        }`}
                        style={{ width: `${progress.pct}%` }}
                        role="progressbar"
                        aria-valuenow={progress.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${doc.fileName} extracted field confirmation progress`}
                      />
                    </div>

                    {docReminders.length > 0 && (
                      <div className="pt-1 space-y-1">
                        {docReminders.map((note, idx) => (
                          <p
                            key={idx}
                            className="text-xs text-[#475569] flex items-start gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#4F46E5] shrink-0 mt-0.5" />
                            <span>{note}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Interactive Image Annotation & Sticky Notes Workspace */}
                  {isAnnotating && (
                    <DocumentAnnotationCanvas
                      imageUrl={doc.previewDataUrl}
                      fileName={doc.fileName}
                      annotations={annotations}
                      onChangeAnnotations={(next) => onUpdateDocumentAnnotations(doc.id, next)}
                    />
                  )}

                  {/* Compliance Warnings */}
                  {doc.warnings.length > 0 && (
                    <div className="rounded-xl bg-[#FEF3C7] border border-amber-200 p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#92400E]">
                        <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                        <span>ITEMS TO DOUBLE-CHECK</span>
                      </div>
                      <ul className="space-y-1 text-sm text-[#92400E] list-disc pl-5">
                        {doc.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Editable & Confirmable Extracted Fields */}
                  {progress.populatedKeys.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {progress.populatedKeys.map(({ key, label }) => {
                        const isConfirmed = progress.confirmedSet.has(key);
                        return (
                          <div
                            key={key}
                            className={`rounded-xl border p-3 space-y-1.5 transition-colors ${
                              isConfirmed
                                ? 'bg-[#ECFDF5]/40 border-[#A7F3D0]'
                                : 'bg-[#F8FAFC] border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-semibold text-[#475569]">
                                {label}
                              </label>
                              <button
                                type="button"
                                onClick={() => handleToggleFieldConfirmed(doc, progress, key)}
                                aria-pressed={isConfirmed}
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                                  isConfirmed
                                    ? 'text-[#065F46]'
                                    : 'text-[#475569] hover:text-[#1E3A8A]'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-[4px] border flex items-center justify-center ${
                                    isConfirmed
                                      ? 'bg-[#10B981] border-[#10B981] text-white'
                                      : 'bg-white border-slate-300'
                                  }`}
                                >
                                  {isConfirmed && <Check className="w-3 h-3 stroke-[2.5]" />}
                                </span>
                                <span>{isConfirmed ? 'Confirmed' : 'Confirm'}</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={doc.extractedFields[key] ?? ''}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                onUpdateDocumentFields(doc.id, {
                                  ...doc.extractedFields,
                                  [key]: nextVal,
                                });
                              }}
                              className="w-full h-10 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm font-mono text-[#1E293B] focus:outline-none focus:border-[#1E3A8A]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#475569]">
                      No structured form fields detected in this image, but the summary is saved in your vault.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <span className="text-xs text-[#475569]">
                      Confirm each extracted field above, or apply directly to confirm and sync all fields.
                    </span>
                    <button
                      type="button"
                      onClick={() => onApplyToProfile(doc.id)}
                      className={`h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                        progress.readyForApplication
                          ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                          : 'bg-[#1E3A8A] hover:bg-[#172554] text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {progress.readyForApplication
                        ? 'Re-Apply to Application Form'
                        : 'Confirm & Apply to Application Form'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 3: Pre-Filled Application Form Sheet */}
      <section className="clearskies-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">Your Travel &amp; Identity Details</h2>
            <p className="text-sm text-[#475569] mt-0.5">
              Auto-populated from your scanned documents—ready to copy into official embassy portals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-semibold text-[#1E3A8A] mr-1">FORM-PREFILL</span>
            <button
              type="button"
              onClick={handleCopyProfile}
              className="h-10 px-4 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedSummary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedSummary ? 'Copied Summary' : 'Copy Summary'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="h-10 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {exportedPdf ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
              {exportedPdf ? 'PDF Downloaded' : 'Export PDF Dossier'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              { key: 'fullName', label: 'Full Name (as in passport)', mono: false },
              { key: 'passportNumber', label: 'Passport Number', mono: true },
              { key: 'nationality', label: 'Passport Nationality', mono: false },
              { key: 'dateOfBirth', label: 'Date of Birth', mono: true },
              { key: 'passportExpiry', label: 'Passport Expiry Date', mono: true },
              { key: 'issuingCountry', label: 'Issuing Country', mono: false },
              { key: 'bankBalance', label: 'Verified Bank Balance', mono: true },
              { key: 'currency', label: 'Currency Code', mono: true },
              { key: 'employerName', label: 'Employer or School', mono: false },
              { key: 'jobTitle', label: 'Occupation / Title', mono: false },
              { key: 'bookingReference', label: 'Flight / Hotel Reference', mono: true },
              { key: 'intendedTravelDates', label: 'Intended Travel Dates', mono: true },
            ] as Array<{ key: keyof ApplicantProfile; label: string; mono: boolean }>
          ).map(({ key, label, mono }) => (
            <div key={key} className="space-y-1">
              <label className="block text-xs font-semibold text-[#475569]">{label}</label>
              <input
                type="text"
                value={profile[key]}
                onChange={(e) => onUpdateProfile({ ...profile, [key]: e.target.value })}
                placeholder="Not yet scanned"
                className={`w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15 ${
                  mono ? 'font-mono tabular-nums' : ''
                }`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-[#475569]">Home / Residential Address</label>
          <input
            type="text"
            value={profile.homeAddress}
            onChange={(e) => onUpdateProfile({ ...profile, homeAddress: e.target.value })}
            placeholder="Street, city, postal code"
            className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#1E293B] focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15"
          />
        </div>
      </section>
    </div>
  );
};
