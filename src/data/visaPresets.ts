import {
  ApplicantProfile,
  ApplicationStage,
  ChecklistItem,
  InterviewQuestion,
  TrackedApplication,
  VisaPurpose,
  VisaTrip,
} from '../types/visa';

export const COUNTRIES = [
  'India',
  'Philippines',
  'Brazil',
  'Nigeria',
  'Mexico',
  'Vietnam',
  'Indonesia',
  'Colombia',
  'Pakistan',
  'Egypt',
  'United States',
  'United Kingdom',
  'France (Schengen)',
  'Germany (Schengen)',
  'Italy (Schengen)',
  'Spain (Schengen)',
  'Japan',
  'Canada',
  'Australia',
  'South Korea',
  'Singapore',
  'United Arab Emirates',
];

export const DESTINATION_PORTALS: Array<{
  destinationPattern: string;
  portalName: string;
  portalUrl: string;
  instructions: string;
  defaultVisaCode: string;
}> = [
  {
    destinationPattern: 'United States',
    portalName: 'CEAC Consular Electronic Application Center',
    portalUrl: 'https://ceac.state.gov/CEACStatTracker/Status.aspx',
    instructions: 'Select Nonimmigrant Visa (NIV), pick your Embassy city, and enter your AA00... DS-160 confirmation number.',
    defaultVisaCode: 'B1/B2',
  },
  {
    destinationPattern: 'Schengen',
    portalName: 'VFS Global / TLScontact Schengen Tracker',
    portalUrl: 'https://visa.vfsglobal.com/',
    instructions: 'Enter your VFS reference number (e.g. FRA/MUM/...) and your last name to check passport dispatch.',
    defaultVisaCode: 'Schengen-C',
  },
  {
    destinationPattern: 'United Kingdom',
    portalName: 'UKVI & VFS Application Portal',
    portalUrl: 'https://www.gov.uk/check-uk-visa',
    instructions: 'Use your GWF reference number in your UKVI account or VFS tracker to view decision and passport collection alerts.',
    defaultVisaCode: 'UK-STD-6M',
  },
  {
    destinationPattern: 'Japan',
    portalName: 'Japan eVISA & Consular Status Portal',
    portalUrl: 'https://www.evisa.mofa.go.jp/personal/logintop',
    instructions: 'Sign in with your application ID to check Examination Underway vs. Visa Issued status.',
    defaultVisaCode: 'JP-TEMP-V',
  },
  {
    destinationPattern: 'Canada',
    portalName: 'IRCC Application Status Tracker',
    portalUrl: 'https://ircc-tracker-suivi.apps.cic.gc.ca/en',
    instructions: 'Enter your UCI and Application Number (V-number) to inspect biometrics, background check, and passport request.',
    defaultVisaCode: 'TRV-V1',
  },
  {
    destinationPattern: 'Australia',
    portalName: 'ImmiAccount (Department of Home Affairs)',
    portalUrl: 'https://online.immi.gov.au/lusc/login',
    instructions: 'Sign into ImmiAccount and view your Transaction Reference Number (TRN) status (Received, Initial Assessment, Finalised).',
    defaultVisaCode: 'Subclass-600',
  },
];

export const APPLICATION_STAGES: ApplicationStage[] = [
  'Drafting',
  'Submitted',
  'Biometrics Done',
  'In Consular Review',
  'Passport Ready',
  'Approved',
];

export function findPortalForDestination(destination: string) {
  const lower = destination.toLowerCase();
  const match = DESTINATION_PORTALS.find((p) => lower.includes(p.destinationPattern.toLowerCase()));
  return (
    match ?? {
      destinationPattern: destination,
      portalName: `${destination} Official Consular Portal`,
      portalUrl: 'https://www.embassy-worldwide.com/',
      instructions: 'Check your embassy confirmation email for your reference tracking link and reference ID.',
      defaultVisaCode: 'VISA-STD',
    }
  );
}

export function buildFallbackChecklist(
  nationality: string,
  destination: string,
  purpose: VisaPurpose,
  travelDate: string
): VisaTrip {
  const portal = findPortalForDestination(destination);
  const isUS = destination.toLowerCase().includes('united states');
  const isSchengen = destination.toLowerCase().includes('schengen');
  const isUK = destination.toLowerCase().includes('united kingdom');
  const isJapan = destination.toLowerCase().includes('japan');

  const visaCode = isUS
    ? purpose === 'Study'
      ? 'F-1'
      : 'B1/B2'
    : isSchengen
      ? 'Schengen-C'
      : isUK
        ? 'UK-STD-6M'
        : isJapan
          ? 'JP-TEMP-V'
          : portal.defaultVisaCode;

  const visaName = isUS
    ? purpose === 'Study'
      ? 'US Student Visa'
      : 'US Visitor & Business Visa'
    : isSchengen
      ? `Schengen Short-Stay Visa (${purpose})`
      : isUK
        ? `UK Standard Visitor Visa (${purpose})`
        : isJapan
          ? `Japan Temporary Visitor Visa (${purpose})`
          : `${destination} ${purpose} Visa`;

  const estimatedFee = isUS ? '$185 USD' : isSchengen ? '€90 EUR' : isUK ? '£115 GBP' : isJapan ? '$22 USD' : '$120 USD';
  const processingWindow = isUS ? '15–45 calendar days (varies by wait time)' : isSchengen ? '15 calendar days' : isUK ? '15 working days' : '5–10 business days';

  const items: ChecklistItem[] = [
    {
      id: 'chk-passport',
      category: 'Identity & Travel Docs',
      title: 'Valid Passport (with 6+ months validity)',
      formCode: 'PASSPORT-BIO',
      plainSummary: `Your ${nationality} passport must be valid for at least 6 months past your planned return date and have 2 blank visa pages.`,
      eli10Explanation:
        'Imagine your passport is your international library card. Countries want to make sure it will not expire while you are visiting, so they require at least 6 extra months left on it plus empty pages for stamps.',
      required: true,
      completed: false,
      linkedDocType: 'passport',
    },
    {
      id: 'chk-photo',
      category: 'Identity & Travel Docs',
      title: 'Recent Visa Passport Photo (White Background)',
      formCode: isUS ? '2x2-IN-PHOTO' : '35x45MM-BIO',
      plainSummary: 'A clear, unedited color photo taken within the last 6 months showing your full face with no glasses or shadows.',
      eli10Explanation:
        'Think of this like a super-strict school picture. No filters, no smiling wide with teeth showing, plain white wall behind you, and taken recently so the officer recognizes you immediately.',
      required: true,
      completed: false,
      linkedDocType: 'photo',
      estimatedCost: '$12 USD',
    },
    {
      id: 'chk-form',
      category: 'Official Forms & Fees',
      title: isUS ? 'Complete Online DS-160 Form' : isSchengen ? 'Complete Schengen Visa Application Form' : `Complete ${destination} Official Visa Form`,
      formCode: isUS ? 'FORM-DS-160' : isSchengen ? 'FORM-SCH-C' : 'FORM-MAIN',
      plainSummary: 'Fill out your personal, passport, and trip history online and save the confirmation barcode page.',
      eli10Explanation:
        'This is the main "get to know you" questionnaire for the embassy. You can pre-fill most of it automatically by uploading your passport photo in our Documents tab!',
      required: true,
      completed: false,
      estimatedCost: estimatedFee,
    },
    {
      id: 'chk-bank',
      category: 'Financial Proof',
      title: 'Last 3–6 Months Bank Statements',
      formCode: 'FIN-PROOF-3M',
      plainSummary: 'Official bank statements showing steady income and enough savings to comfortably cover flights, hotels, and daily meals.',
      eli10Explanation:
        'The country wants to be sure you will not run out of money mid-trip. Showing a few months of regular bank statements proves you have steady funds and are not borrowing money just for one day.',
      required: true,
      completed: false,
      linkedDocType: 'financial',
    },
    {
      id: 'chk-itinerary',
      category: 'Supporting Evidence',
      title: 'Round-Trip Flight Reservation & Hotel Booking',
      formCode: 'TRIP-ITIN',
      plainSummary: 'Confirmed or refundable flight itinerary and accommodation details matching your intended travel dates.',
      eli10Explanation:
        'This shows the officer when you plan to arrive, where you will sleep each night, and—most importantly—the ticket proving you plan to fly back home.',
      required: true,
      completed: false,
      linkedDocType: 'itinerary',
    },
    {
      id: 'chk-ties',
      category: 'Supporting Evidence',
      title: purpose === 'Study' ? 'University Admission / Enrollment Letter' : 'Employment Leave Letter or Proof of Ties Home',
      formCode: purpose === 'Study' ? 'I-20 / CAS' : 'EMP-NOC-01',
      plainSummary:
        purpose === 'Study'
          ? 'Official acceptance letter from your school confirming your program start date and tuition status.'
          : 'A letter from your employer (or business registration) confirming your role, salary, and approved vacation dates.',
      eli10Explanation:
        'Embassies love seeing reasons you have to come back home after your trip—like a job waiting for you, classes to attend, or family at home.',
      required: true,
      completed: false,
      linkedDocType: 'employment',
    },
  ];

  if (isSchengen) {
    items.push({
      id: 'chk-insurance',
      category: 'Official Forms & Fees',
      title: 'Schengen Travel Medical Insurance (€30,000+ Coverage)',
      formCode: 'MED-INS-30K',
      plainSummary: 'Travel health insurance valid across all Schengen countries covering at least €30,000 for emergencies and repatriation.',
      eli10Explanation:
        'If you accidentally break an arm or catch the flu while traveling in Europe, this special safety-net card pays the hospital bills so you do not have to.',
      required: true,
      completed: false,
      estimatedCost: '$25–$45 USD',
    });
  }

  return {
    id: `trip-${Date.now()}`,
    nationality,
    destination,
    visaCode,
    visaName,
    purpose,
    travelDate,
    estimatedFee,
    processingWindow,
    validityRule: 'Passport must remain valid for 6+ months beyond planned return date.',
    createdAt: new Date().toISOString(),
    checklistItems: items,
  };
}

export const INITIAL_TRIP: VisaTrip = buildFallbackChecklist('India', 'France (Schengen)', 'Tourism', '2026-12-18');

export const INITIAL_PROFILE: ApplicantProfile = {
  fullName: '',
  passportNumber: '',
  nationality: 'India',
  dateOfBirth: '',
  passportExpiry: '',
  issuingCountry: 'India',
  bankBalance: '',
  currency: 'USD',
  employerName: '',
  jobTitle: '',
  homeAddress: '',
  intendedTravelDates: '2026-12-18 to 2026-12-28',
  bookingReference: '',
};

export const INITIAL_TRACKED_APPLICATIONS: TrackedApplication[] = [
  {
    id: 'app-sample-1',
    referenceNumber: 'FRA/MUM/2026/88412',
    portalName: 'VFS Global / TLScontact Schengen Tracker',
    portalUrl: 'https://visa.vfsglobal.com/',
    embassyCity: 'Mumbai Consulate',
    destination: 'France (Schengen)',
    visaType: 'Schengen-C',
    submittedDate: '2026-11-02',
    appointmentDate: '2026-11-18',
    currentStage: 'Biometrics Done',
    lastCheckedAt: '2026-11-12',
    statusHistory: [
      {
        id: 'log-1',
        stage: 'Drafting',
        timestamp: '2026-10-28',
        note: 'Started Schengen-C tourist application and gathered bank statements.',
      },
      {
        id: 'log-2',
        stage: 'Submitted',
        timestamp: '2026-11-02',
        note: 'Submitted online form and paid €90 visa fee.',
      },
      {
        id: 'log-3',
        stage: 'Biometrics Done',
        timestamp: '2026-11-10',
        note: 'Completed fingerprints and passport handoff at VFS center.',
      },
    ],
    reminders: [
      {
        id: 'rem-1',
        title: 'Check VFS portal for embassy dispatch update',
        dueDate: '2026-11-19',
        category: 'Embassy Follow-Up',
        completed: false,
      },
      {
        id: 'rem-2',
        title: 'Verify travel medical insurance PDF printed for airport',
        dueDate: '2026-12-10',
        category: 'Travel Prep',
        completed: false,
      },
    ],
  },
];

export const INITIAL_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'iq-1',
    question: 'What is the main purpose of your trip, and how long will you stay?',
    whyTheyAsk: 'Officers want to confirm your trip matches the visa category you applied for and has clear start and end dates.',
    sampleStrongAnswer:
      'I am traveling for a 10-day winter holiday from December 18 to December 28 to visit Paris and Lyon, and I return to work on January 2.',
  },
  {
    id: 'iq-2',
    question: 'Who is paying for your trip, and what do you do for work?',
    whyTheyAsk: 'Confirms you can afford travel without working illegally abroad and have stable income waiting at home.',
    sampleStrongAnswer:
      'I am funding the trip entirely from my personal savings. I have worked as a product designer at my current company for three years, and my approved leave letter is in my folder.',
  },
  {
    id: 'iq-3',
    question: 'Do you have family or friends living in the destination country?',
    whyTheyAsk: 'Checks transparency—always answer honestly whether you are staying at a hotel or visiting someone.',
    sampleStrongAnswer:
      'No, I do not have relatives there. I have confirmed hotel reservations in central Paris and Lyon for every night of my itinerary.',
  },
  {
    id: 'iq-4',
    question: 'What guarantees you will return home after your trip ends?',
    whyTheyAsk: 'Evaluates ties to your home country such as employment, ongoing studies, property, or family responsibilities.',
    sampleStrongAnswer:
      'My full-time job resumes right after the holidays, I lease an apartment in Mumbai, and my parents live with me.',
  },
];
