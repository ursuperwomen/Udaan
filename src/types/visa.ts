export type VisaPurpose = 'Tourism' | 'Business' | 'Study' | 'Work' | 'Family Visit';

export type ChecklistCategory =
  | 'Identity & Travel Docs'
  | 'Financial Proof'
  | 'Official Forms & Fees'
  | 'Supporting Evidence';

export type DocumentKind = 'passport' | 'financial' | 'itinerary' | 'employment' | 'photo';

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  title: string;
  formCode?: string;
  plainSummary: string;
  eli10Explanation: string;
  required: boolean;
  completed: boolean;
  linkedDocType?: DocumentKind;
  estimatedCost?: string;
}

export interface VisaTrip {
  id: string;
  nationality: string;
  destination: string;
  visaCode: string;
  visaName: string;
  purpose: VisaPurpose;
  travelDate: string;
  estimatedFee: string;
  processingWindow: string;
  validityRule: string;
  createdAt: string;
  checklistItems: ChecklistItem[];
}

export interface ExtractedDocumentFields {
  fullName?: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  issuingCountry?: string;
  accountHolder?: string;
  bankName?: string;
  endingBalance?: string;
  currency?: string;
  statementPeriod?: string;
  employerName?: string;
  jobTitle?: string;
  flightOrBookingRef?: string;
  travelDates?: string;
  destinationCity?: string;
}

export interface DocumentAnnotation {
  id: string;
  xPct: number;
  yPct: number;
  note: string;
  tone: 'amber' | 'blue' | 'mint';
  createdAt: string;
}

export interface UploadedDocument {
  id: string;
  docType: DocumentKind;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  previewDataUrl: string;
  summary: string;
  warnings: string[];
  extractedFields: ExtractedDocumentFields;
  confirmedFields?: Array<keyof ExtractedDocumentFields>;
  appliedToProfile: boolean;
  annotations?: DocumentAnnotation[];
}

export interface ApplicantProfile {
  fullName: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  passportExpiry: string;
  issuingCountry: string;
  bankBalance: string;
  currency: string;
  employerName: string;
  jobTitle: string;
  homeAddress: string;
  intendedTravelDates: string;
  bookingReference: string;
}

export type ApplicationStage =
  | 'Drafting'
  | 'Submitted'
  | 'Biometrics Done'
  | 'In Consular Review'
  | 'Passport Ready'
  | 'Approved';

export interface StatusLogEntry {
  id: string;
  stage: ApplicationStage;
  timestamp: string;
  note: string;
  keyDate?: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  dueDate: string;
  category: 'Appointment' | 'Document Expiry' | 'Embassy Follow-Up' | 'Travel Prep';
  completed: boolean;
}

export interface TrackedApplication {
  id: string;
  referenceNumber: string;
  portalName: string;
  portalUrl: string;
  embassyCity: string;
  destination: string;
  visaType: string;
  submittedDate: string;
  appointmentDate: string;
  currentStage: ApplicationStage;
  lastCheckedAt: string;
  statusHistory: StatusLogEntry[];
  reminders: ReminderItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  whyTheyAsk: string;
  sampleStrongAnswer: string;
  userAnswer?: string;
  aiFeedback?: string;
}

export interface BudgetExpenseItem {
  id: string;
  label: string;
  category: 'Visa & Admin' | 'Insurance' | 'Flights' | 'Lodging & Other';
  amount: string;
  paid: boolean;
}

export interface TravelBudget {
  currency: string;
  visaFee: string;
  visaFeePaid: boolean;
  serviceFee: string;
  serviceFeePaid: boolean;
  travelInsurance: string;
  travelInsurancePaid: boolean;
  flightBookings: string;
  flightBookingsPaid: boolean;
  accommodation: string;
  accommodationPaid: boolean;
  customExpenses: BudgetExpenseItem[];
}

export type ActiveTab = 'checklist' | 'documents' | 'tracker' | 'budget' | 'interview';
