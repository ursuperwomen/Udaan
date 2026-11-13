import { jsPDF } from 'jspdf';
import {
  ApplicantProfile,
  ExtractedDocumentFields,
  UploadedDocument,
  VisaTrip,
} from '../types/visa';

interface ExportProfilePdfInput {
  profile: ApplicantProfile;
  documents: UploadedDocument[];
  trip: VisaTrip;
}

const BLUE: [number, number, number] = [30, 58, 138]; // #1E3A8A
const MINT: [number, number, number] = [6, 95, 70]; // #065F46
const AMBER: [number, number, number] = [146, 64, 14]; // #92400E
const INK: [number, number, number] = [15, 23, 42]; // #0F172A
const MUTED: [number, number, number] = [71, 85, 105]; // #475569
const BORDER: [number, number, number] = [203, 213, 225]; // #CBD5E1
const HAIRLINE: [number, number, number] = [226, 232, 240]; // #E2E8F0

const EXTRACTED_FIELD_LABELS: Array<{ key: keyof ExtractedDocumentFields; label: string }> = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'passportNumber', label: 'Passport No.' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'issuingCountry', label: 'Issuing Country' },
  { key: 'accountHolder', label: 'Account Holder' },
  { key: 'bankName', label: 'Bank / Institution' },
  { key: 'endingBalance', label: 'Ending Balance' },
  { key: 'currency', label: 'Currency' },
  { key: 'statementPeriod', label: 'Statement Period' },
  { key: 'employerName', label: 'Employer / School' },
  { key: 'jobTitle', label: 'Role / Title' },
  { key: 'flightOrBookingRef', label: 'Booking Ref.' },
  { key: 'travelDates', label: 'Travel Dates' },
  { key: 'destinationCity', label: 'Destination City' },
];

export function exportCompiledProfilePdf({
  profile,
  documents,
  trip,
}: ExportProfilePdfInput): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = 44;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 54) {
      doc.addPage();
      y = 48;
    }
  };

  // Printer-Friendly Header (white background, crisp accent rule, high-contrast ink)
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('UDAAN', margin, y);

  const generatedStamp = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`GENERATED: ${generatedStamp.toUpperCase()}`, pageWidth - margin, y - 4, { align: 'right' });
  doc.text(`FORM-PREFILL · ${trip.visaCode}`, pageWidth - margin, y + 10, { align: 'right' });

  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  doc.text('Compiled Application Profile & Extracted Document Dossier', margin, y);

  y += 12;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.75);
  y += 18;

  // Trip Route Summary Box (ink-light outline only)
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text(`${trip.nationality} Passport  ->  ${trip.destination}`, margin + 12, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const completedCount = trip.checklistItems.filter((i) => i.completed).length;
  const routeMeta = [
    trip.visaName,
    `Purpose: ${trip.purpose}`,
    `Departure: ${trip.travelDate || 'Not set'}`,
    `Est. Fee: ${trip.estimatedFee}`,
    `Checklist: ${completedCount}/${trip.checklistItems.length} ready`,
  ].join('  ·  ');
  const routeLines = doc.splitTextToSize(routeMeta, contentWidth - 24);
  doc.text(routeLines, margin + 12, y + 38);

  y += 74;

  // Section 1: Applicant & Travel Profile
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...BLUE);
  doc.text('01. Applicant & Travel Profile', margin, y);
  y += 7;
  doc.setDrawColor(...BORDER);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  const profileRows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Full Name (as in passport)', value: profile.fullName || 'Not provided' },
    { label: 'Passport Number', value: profile.passportNumber || 'Not provided', mono: true },
    { label: 'Passport Nationality', value: profile.nationality || 'Not provided' },
    { label: 'Date of Birth', value: profile.dateOfBirth || 'Not provided', mono: true },
    { label: 'Passport Expiry Date', value: profile.passportExpiry || 'Not provided', mono: true },
    { label: 'Issuing Country', value: profile.issuingCountry || 'Not provided' },
    {
      label: 'Verified Bank Balance',
      value: profile.bankBalance ? `${profile.currency} ${profile.bankBalance}` : 'Not provided',
      mono: true,
    },
    { label: 'Employer / School', value: profile.employerName || 'Not provided' },
    { label: 'Occupation / Title', value: profile.jobTitle || 'Not provided' },
    { label: 'Booking Reference', value: profile.bookingReference || 'Not provided', mono: true },
    { label: 'Intended Travel Dates', value: profile.intendedTravelDates || 'Not provided', mono: true },
    { label: 'Home / Residential Address', value: profile.homeAddress || 'Not provided' },
  ];

  const colWidth = (contentWidth - 16) / 2;
  for (let i = 0; i < profileRows.length; i += 2) {
    ensureSpace(40);
    const left = profileRows[i];
    const right = profileRows[i + 1];

    [left, right].forEach((entry, idx) => {
      if (!entry) return;
      const x = margin + idx * (colWidth + 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(entry.label.toUpperCase(), x, y);

      doc.setFont(entry.mono ? 'courier' : 'helvetica', entry.mono ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const valLines = doc.splitTextToSize(entry.value, colWidth);
      doc.text(valLines[0] || '—', x, y + 13);
    });

    y += 30;
    doc.setDrawColor(...HAIRLINE);
    doc.line(margin, y - 4, pageWidth - margin, y - 4);
    y += 4;
  }

  y += 10;

  // Section 2: Aggregated Extracted Document Data & Verification Metadata
  ensureSpace(64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...BLUE);
  doc.text(`02. Extracted Document Data (${documents.length} Scanned)`, margin, y);
  y += 7;
  doc.setDrawColor(...BORDER);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  if (documents.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(
      'No document images uploaded yet. Scan passports, bank statements, or bookings in UDAAN to include extracted fields here.',
      margin,
      y,
      { maxWidth: contentWidth }
    );
    y += 34;
  } else {
    documents.forEach((item, index) => {
      const populatedFields = EXTRACTED_FIELD_LABELS.filter(({ key }) =>
        Boolean(item.extractedFields[key]?.trim())
      );
      const fieldRowsCount = Math.ceil(populatedFields.length / 2);
      const summaryLines = doc.splitTextToSize(item.summary || 'Scanned document.', contentWidth - 24);
      const warningLines = item.warnings.flatMap((w) =>
        doc.splitTextToSize(`! ${w}`, contentWidth - 28)
      );

      const annotationLines = (item.annotations ?? []).flatMap((ann, aIdx) =>
        doc.splitTextToSize(`Note #${aIdx + 1} [${ann.tone.toUpperCase()}]: ${ann.note}`, contentWidth - 28)
      );

      const boxHeight =
        48 +
        summaryLines.length * 13 +
        (fieldRowsCount > 0 ? 12 + fieldRowsCount * 24 : 0) +
        (annotationLines.length > 0 ? 14 + annotationLines.length * 12 : 0) +
        (warningLines.length > 0 ? 16 + warningLines.length * 12 : 0);

      ensureSpace(boxHeight + 12);

      // Clean outline-only container for ink-friendly printing
      doc.setDrawColor(...BORDER);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      doc.text(`${index + 1}. ${item.fileName}`, margin + 12, y + 18);

      const statusText = item.appliedToProfile ? 'APPLIED TO FORM' : 'REVIEWED';
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...(item.appliedToProfile ? MINT : MUTED));
      doc.text(statusText, pageWidth - margin - 12, y + 18, { align: 'right' });

      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(
        `TYPE: ${item.docType.toUpperCase()}  ·  UPLOADED: ${item.uploadedAt}`,
        margin + 12,
        y + 32
      );

      let cursorY = y + 48;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(summaryLines, margin + 12, cursorY);
      cursorY += summaryLines.length * 13 + 6;

      // Render every extracted key-value pair in clean 2-column grid
      if (populatedFields.length > 0) {
        doc.setDrawColor(...HAIRLINE);
        doc.line(margin + 12, cursorY - 2, pageWidth - margin - 12, cursorY - 2);
        cursorY += 10;

        const subColWidth = (contentWidth - 36) / 2;
        for (let r = 0; r < populatedFields.length; r += 2) {
          const leftField = populatedFields[r];
          const rightField = populatedFields[r + 1];

          [leftField, rightField].forEach((f, idx) => {
            if (!f) return;
            const fx = margin + 12 + idx * (subColWidth + 12);
            const rawVal = item.extractedFields[f.key] ?? '';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...MUTED);
            doc.text(f.label.toUpperCase(), fx, cursorY);

            doc.setFont('courier', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...INK);
            const clipped = doc.splitTextToSize(rawVal, subColWidth)[0] || rawVal;
            doc.text(clipped, fx, cursorY + 11);
          });

          cursorY += 24;
        }
      }

      if (annotationLines.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...BLUE);
        doc.text(annotationLines, margin + 12, cursorY + 4);
        cursorY += annotationLines.length * 12 + 8;
      }

      if (warningLines.length > 0) {
        doc.setDrawColor(...AMBER);
        doc.roundedRect(margin + 12, cursorY, contentWidth - 24, 12 + warningLines.length * 12, 3, 3, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...AMBER);
        doc.text(warningLines, margin + 18, cursorY + 12);
      }

      y += boxHeight + 10;
    });
  }

  y += 8;

  // Section 3: Checklist Readiness Snapshot
  ensureSpace(64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...BLUE);
  doc.text('03. Checklist Readiness Snapshot', margin, y);
  y += 7;
  doc.setDrawColor(...BORDER);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  trip.checklistItems.forEach((chk) => {
    ensureSpace(26);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(chk.completed ? MINT : AMBER));
    doc.text(chk.completed ? '[READY]' : '[TODO] ', margin, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const titleStr = chk.formCode ? `${chk.title} (${chk.formCode})` : chk.title;
    const titleLines = doc.splitTextToSize(titleStr, contentWidth - 65);
    doc.text(titleLines, margin + 54, y);
    y += titleLines.length * 13 + 6;
  });

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      'Prepared with UDAAN · Double-check all details against your original passport before submission.',
      margin,
      pageHeight - 22
    );
    doc.setFont('courier', 'normal');
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
  }

  const slug = trip.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fileName = `udaan-visa-profile-${slug || 'dossier'}.pdf`;
  doc.save(fileName);
  return fileName;
}
