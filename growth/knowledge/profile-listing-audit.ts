/**
 * Growth Agent — Core Skill: Profile & Listing Audit
 *
 * UK-primary, internationally-aware knowledge base for auditing tutor profiles
 * and marketplace listings. Covers pricing benchmarks, listing quality standards,
 * SEO keywords, qualifications, safeguarding requirements, and marketplace
 * positioning across UK, US, Australia, HK, Singapore, and UAE markets.
 *
 * Sources (knowledge cutoff 2025-08):
 *   - The Tutors' Association (TTA) Code of Professional Conduct
 *   - UK Government DBS guidance (gov.uk/dbs-check-applicant-criminal-record)
 *   - Ofsted framework (private tutors not regulated, but standards referenced)
 *   - MyTutor, TutorHunt, Superprof published rate guides 2024-2025
 *   - Wyzant, Tutor.com, Varsity Tutors US rate data
 *   - Australian Cluey Learning, Tutor.com.au benchmarks
 *   - UK National Curriculum (NC) and Ofqual qualification framework
 *   - UCAS, Russell Group university entrance standards
 *   - EU ISCED (International Standard Classification of Education)
 *   - US Department of Education, Common Core State Standards
 *   - Sutton Trust tutoring reports 2023-2024
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PricingBenchmark {
  region: string;
  currency: string;
  level: string;
  subjects: SubjectRate[];
  notes: string;
}

export interface SubjectRate {
  subject: string;
  minRate: number;
  typicalRate: number;
  premiumRate: number;
  demandLevel: 'very-high' | 'high' | 'medium' | 'low';
  notes?: string;
}

export interface ListingQualityCriteria {
  id: string;
  category: string;
  criterion: string;
  weight: number; // 1-10, contribution to listing score
  benchmark: string;
  failureSignal: string;
  fixSuggestion: string;
}

export interface QualificationWeight {
  qualification: string;
  countryContext: string;
  trustSignal: number; // 1-10 how much parents value it
  premiumJustification: string;
  notes: string;
}

export interface SafeguardingRequirement {
  country: string;
  requirement: string;
  mandatory: boolean;
  cost: string;
  renewalPeriod: string;
  authority: string;
  notes: string;
}

export interface ListingAuditSignature {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  chainOfThought: boolean;
  examples: ListingAuditExample[];
}

export interface ListingAuditExample {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  reasoning: string;
}

// ============================================================================
// UK PRICING BENCHMARKS (primary market)
// ============================================================================

export const UK_PRICING_BENCHMARKS: PricingBenchmark[] = [
  {
    region: 'UK — National Average (Online)',
    currency: 'GBP',
    level: 'Primary (KS1–KS2, Ages 5–11)',
    notes: 'Driven by SATs prep, 11+ entrance exam coaching, and reading/numeracy catch-up. National Curriculum Key Stages 1–2.',
    subjects: [
      { subject: 'Maths', minRate: 20, typicalRate: 28, premiumRate: 55, demandLevel: 'very-high', notes: 'KS2 SATs maths is biggest driver. 11+ prep commands premium.' },
      { subject: 'English / Literacy', minRate: 18, typicalRate: 25, premiumRate: 50, demandLevel: 'high', notes: 'Reading and comprehension. SPAG focus at KS2.' },
      { subject: '11+ / Entrance Exam Prep', minRate: 35, typicalRate: 50, premiumRate: 90, demandLevel: 'very-high', notes: 'GL Assessment and CEM format. London grammar school prep is price-insensitive.' },
      { subject: 'Science', minRate: 18, typicalRate: 25, premiumRate: 45, demandLevel: 'medium' },
      { subject: 'General (Phonics, SEND)', minRate: 20, typicalRate: 30, premiumRate: 55, demandLevel: 'high', notes: 'SEND and EHC Plan children — specialist premium justified.' },
    ],
  },
  {
    region: 'UK — National Average (Online)',
    currency: 'GBP',
    level: 'Secondary KS3 (Ages 11–14)',
    notes: 'Transition year. Parents invest to prevent academic drift. NC Year 7–9.',
    subjects: [
      { subject: 'Maths', minRate: 25, typicalRate: 35, premiumRate: 65, demandLevel: 'very-high' },
      { subject: 'English', minRate: 22, typicalRate: 30, premiumRate: 55, demandLevel: 'high' },
      { subject: 'Science', minRate: 22, typicalRate: 30, premiumRate: 55, demandLevel: 'high' },
      { subject: 'French / Spanish', minRate: 20, typicalRate: 28, premiumRate: 50, demandLevel: 'medium' },
      { subject: 'History / Geography', minRate: 18, typicalRate: 25, premiumRate: 45, demandLevel: 'low' },
    ],
  },
  {
    region: 'UK — National Average (Online)',
    currency: 'GBP',
    level: 'GCSE (Ages 14–16, Year 10–11)',
    notes: 'Highest volume tier. GCSE Maths is legally required to pass for college. AQA, Edexcel, OCR, WJEC exam boards. Peak demand January–June.',
    subjects: [
      { subject: 'Maths', minRate: 30, typicalRate: 42, premiumRate: 75, demandLevel: 'very-high', notes: 'Must-pass for post-16. Resit market adds year-round demand.' },
      { subject: 'English Language', minRate: 28, typicalRate: 38, premiumRate: 65, demandLevel: 'high', notes: 'Also must-pass for many college courses.' },
      { subject: 'English Literature', minRate: 28, typicalRate: 36, premiumRate: 60, demandLevel: 'medium' },
      { subject: 'Biology', minRate: 30, typicalRate: 40, premiumRate: 70, demandLevel: 'high' },
      { subject: 'Chemistry', minRate: 30, typicalRate: 42, premiumRate: 75, demandLevel: 'high', notes: 'High demand due to complexity. GCSE Chemistry resits common.' },
      { subject: 'Physics', minRate: 30, typicalRate: 40, premiumRate: 70, demandLevel: 'high' },
      { subject: 'Combined Science', minRate: 28, typicalRate: 38, premiumRate: 65, demandLevel: 'high' },
      { subject: 'French', minRate: 25, typicalRate: 35, premiumRate: 60, demandLevel: 'medium' },
      { subject: 'Spanish', minRate: 25, typicalRate: 35, premiumRate: 60, demandLevel: 'medium' },
      { subject: 'History', minRate: 25, typicalRate: 33, premiumRate: 55, demandLevel: 'medium' },
      { subject: 'Geography', minRate: 22, typicalRate: 30, premiumRate: 50, demandLevel: 'low' },
      { subject: 'Computer Science', minRate: 30, typicalRate: 42, premiumRate: 70, demandLevel: 'high', notes: 'Growing rapidly. Python/coding knowledge valued by parents.' },
      { subject: 'Religious Studies', minRate: 20, typicalRate: 28, premiumRate: 45, demandLevel: 'low' },
    ],
  },
  {
    region: 'UK — National Average (Online)',
    currency: 'GBP',
    level: 'A-Level (Ages 16–18, Year 12–13)',
    notes: 'Smaller cohort but higher value per student. University admissions pressure. UCAS points critical.',
    subjects: [
      { subject: 'Maths', minRate: 35, typicalRate: 50, premiumRate: 85, demandLevel: 'very-high', notes: 'Further Maths (A-Level) commands additional 20-30% premium.' },
      { subject: 'Further Maths', minRate: 45, typicalRate: 65, premiumRate: 100, demandLevel: 'high', notes: 'Specialist — few tutors qualified. Commands significant premium.' },
      { subject: 'Chemistry', minRate: 38, typicalRate: 55, premiumRate: 90, demandLevel: 'very-high', notes: 'UCAT/medicine route. Many students fail A-Level Chemistry — high urgency.' },
      { subject: 'Biology', minRate: 35, typicalRate: 50, premiumRate: 85, demandLevel: 'high' },
      { subject: 'Physics', minRate: 38, typicalRate: 55, premiumRate: 90, demandLevel: 'high' },
      { subject: 'English Literature', minRate: 32, typicalRate: 45, premiumRate: 75, demandLevel: 'medium' },
      { subject: 'History', minRate: 30, typicalRate: 42, premiumRate: 70, demandLevel: 'medium' },
      { subject: 'Economics', minRate: 35, typicalRate: 52, premiumRate: 85, demandLevel: 'high', notes: 'Business/Russell Group applicants. Parents very price-insensitive.' },
      { subject: 'Psychology', minRate: 28, typicalRate: 38, premiumRate: 65, demandLevel: 'medium' },
      { subject: 'French / Spanish', minRate: 32, typicalRate: 45, premiumRate: 75, demandLevel: 'medium' },
      { subject: 'Computer Science', minRate: 38, typicalRate: 55, premiumRate: 90, demandLevel: 'high' },
    ],
  },
  {
    region: 'UK — National Average (Online)',
    currency: 'GBP',
    level: 'University / Degree Level',
    notes: 'International students are major segment. Dissertation support, exam revision, subject tutoring.',
    subjects: [
      { subject: 'Maths / Statistics', minRate: 40, typicalRate: 60, premiumRate: 100, demandLevel: 'high' },
      { subject: 'Engineering', minRate: 45, typicalRate: 65, premiumRate: 110, demandLevel: 'medium' },
      { subject: 'Economics / Finance', minRate: 40, typicalRate: 65, premiumRate: 110, demandLevel: 'high' },
      { subject: 'Law', minRate: 40, typicalRate: 60, premiumRate: 100, demandLevel: 'medium' },
      { subject: 'Medicine / UCAT/BMAT', minRate: 60, typicalRate: 100, premiumRate: 200, demandLevel: 'very-high', notes: 'UCAT prep is highly specialised. Former medics command top rates.' },
      { subject: 'Essay / Academic Writing', minRate: 35, typicalRate: 55, premiumRate: 90, demandLevel: 'high', notes: 'International students. IELTS/TOEFL is adjacent market.' },
    ],
  },
  {
    region: 'UK — London Premium (+30–50% above national)',
    currency: 'GBP',
    level: 'All Levels',
    notes: 'London tutors consistently earn 30-50% above national average. South London, North London, West London all command premium. In-person sessions have additional travel premium.',
    subjects: [
      { subject: 'GCSE Maths (London)', minRate: 45, typicalRate: 65, premiumRate: 100, demandLevel: 'very-high' },
      { subject: 'A-Level Chemistry (London)', minRate: 55, typicalRate: 80, premiumRate: 130, demandLevel: 'very-high' },
      { subject: '11+ Prep (London grammar schools)', minRate: 55, typicalRate: 80, premiumRate: 150, demandLevel: 'very-high', notes: 'London grammar school places extremely competitive. Super Selective schools (Tiffin, Henrietta Barnett) drive premium.' },
      { subject: 'Oxbridge Admissions Prep', minRate: 80, typicalRate: 130, premiumRate: 300, demandLevel: 'high', notes: 'Interview coaching, TSA/MAT/LNAT prep. Former Oxbridge tutors at top end.' },
    ],
  },
];

// ============================================================================
// INTERNATIONAL PRICING BENCHMARKS
// ============================================================================

export const INTERNATIONAL_PRICING_BENCHMARKS: PricingBenchmark[] = [
  {
    region: 'United States',
    currency: 'USD',
    level: 'All Levels',
    notes: 'SAT/ACT prep is the dominant driver alongside subject tutoring. State curriculum varies but Common Core Maths is standard. Wyzant takes 25-40% commission; independent tutors net more.',
    subjects: [
      { subject: 'Elementary Maths/Reading', minRate: 30, typicalRate: 50, premiumRate: 80, demandLevel: 'high' },
      { subject: 'Middle/High School Maths', minRate: 40, typicalRate: 70, premiumRate: 120, demandLevel: 'very-high' },
      { subject: 'SAT/ACT Prep (Maths)', minRate: 60, typicalRate: 100, premiumRate: 200, demandLevel: 'very-high', notes: 'Test dates: Oct/Nov and Mar/Apr. Tutors who specialise in specific tests earn significantly more.' },
      { subject: 'SAT/ACT Prep (English/Reading)', minRate: 55, typicalRate: 90, premiumRate: 180, demandLevel: 'high' },
      { subject: 'AP Exams (Advanced Placement)', minRate: 50, typicalRate: 85, premiumRate: 150, demandLevel: 'high', notes: 'US equivalent of A-Levels. AP exams in May drive Apr-May surge.' },
      { subject: 'College Essay/Application', minRate: 80, typicalRate: 150, premiumRate: 400, demandLevel: 'high', notes: 'Ivy League / top college application coaching. Short engagement, high value.' },
      { subject: 'LSAT/MCAT/GMAT Prep', minRate: 80, typicalRate: 150, premiumRate: 300, demandLevel: 'medium', notes: 'Professional exam prep. Specialised market.' },
    ],
  },
  {
    region: 'Australia',
    currency: 'AUD',
    level: 'All Levels',
    notes: 'HSC (NSW), VCE (Victoria), QCE (QLD) are the key Year 12 qualifications. ATAR score determines university admission. Working with Children Check (WWCC) mandatory — state-specific.',
    subjects: [
      { subject: 'Primary Maths/English', minRate: 30, typicalRate: 50, premiumRate: 80, demandLevel: 'high' },
      { subject: 'Year 7-10 Maths', minRate: 45, typicalRate: 65, premiumRate: 100, demandLevel: 'high' },
      { subject: 'HSC/VCE Maths (Year 12)', minRate: 60, typicalRate: 90, premiumRate: 140, demandLevel: 'very-high', notes: 'Selective school exam prep commands premium. Sydney Grammar, James Ruse applicants.' },
      { subject: 'HSC/VCE Sciences', minRate: 55, typicalRate: 80, premiumRate: 130, demandLevel: 'high' },
      { subject: 'UMAT/GAMSAT (Medicine)', minRate: 80, typicalRate: 130, premiumRate: 220, demandLevel: 'medium' },
      { subject: 'NAPLAN Prep (Years 3,5,7,9)', minRate: 40, typicalRate: 60, premiumRate: 95, demandLevel: 'medium', notes: 'National test, held in May. Significant anxiety around it.' },
    ],
  },
  {
    region: 'Hong Kong',
    currency: 'HKD',
    level: 'All Levels',
    notes: 'One of the world\'s most intensive tutoring cultures. DSE (Diploma of Secondary Education) — equivalent to A-Levels — drives massive demand. "Tutor kings/queens" are cultural celebrities.',
    subjects: [
      { subject: 'DSE Maths', minRate: 200, typicalRate: 500, premiumRate: 3000, demandLevel: 'very-high', notes: 'Elite tutors charge HKD 3,000+/hr. Premium DSE tutor "centres" charge group rates of HKD 500-1500/session.' },
      { subject: 'DSE English', minRate: 180, typicalRate: 400, premiumRate: 2000, demandLevel: 'very-high' },
      { subject: 'DSE Sciences', minRate: 200, typicalRate: 500, premiumRate: 2500, demandLevel: 'high' },
      { subject: 'IB Diploma (international schools)', minRate: 400, typicalRate: 800, premiumRate: 2000, demandLevel: 'high', notes: 'International School / IB students. English-language tutors valued.' },
    ],
  },
  {
    region: 'Singapore',
    currency: 'SGD',
    level: 'All Levels',
    notes: 'MOE (Ministry of Education) regulates tutoring centres but not individual tutors. PSLE (Primary 6), O-Levels (Secondary), A-Levels (JC) are the key milestones. Culturally, tutoring is expected at all levels.',
    subjects: [
      { subject: 'PSLE Maths/Science (Primary)', minRate: 25, typicalRate: 45, premiumRate: 90, demandLevel: 'very-high', notes: 'PSLE results determine secondary school streaming. Extremely high parental pressure.' },
      { subject: 'O-Level Maths', minRate: 30, typicalRate: 55, premiumRate: 100, demandLevel: 'very-high' },
      { subject: 'O-Level Sciences', minRate: 30, typicalRate: 55, premiumRate: 100, demandLevel: 'high' },
      { subject: 'A-Level H2 Maths', minRate: 50, typicalRate: 80, premiumRate: 150, demandLevel: 'high' },
      { subject: 'Chinese Language (Mandarin)', minRate: 25, typicalRate: 45, premiumRate: 80, demandLevel: 'high', notes: 'Mandatory subject for Chinese-background students. Mother tongue tutoring is distinct market.' },
    ],
  },
  {
    region: 'UAE (Dubai / Abu Dhabi)',
    currency: 'AED',
    level: 'All Levels',
    notes: 'Large expat community follows UK/US/IB curricula. KHDA regulates tutoring centres in Dubai; individual tutors are not regulated. UK/US-trained native English speakers command premium.',
    subjects: [
      { subject: 'IGCSE Maths (UK curriculum)', minRate: 150, typicalRate: 250, premiumRate: 500, demandLevel: 'very-high', notes: 'British expat schools use Cambridge IGCSE. Native UK tutors highly sought.' },
      { subject: 'IB Diploma Maths/Sciences', minRate: 200, typicalRate: 350, premiumRate: 600, demandLevel: 'high' },
      { subject: 'SAT/ACT Prep (US curriculum)', minRate: 200, typicalRate: 350, premiumRate: 700, demandLevel: 'high', notes: 'American school parents. Many aim for US Ivy League.' },
      { subject: 'Arabic Language', minRate: 100, typicalRate: 180, premiumRate: 350, demandLevel: 'medium' },
      { subject: 'English (EAL)', minRate: 150, typicalRate: 250, premiumRate: 500, demandLevel: 'high' },
    ],
  },
  {
    region: 'Germany / EU',
    currency: 'EUR',
    level: 'All Levels',
    notes: 'German tutoring market ~€2bn/year. Nachhilfe (private lessons) mainstream. Abitur is key school leaving qualification. EU broadly follows ISCED classification levels.',
    subjects: [
      { subject: 'Maths (Abitur / Baccalaureate)', minRate: 20, typicalRate: 35, premiumRate: 65, demandLevel: 'very-high' },
      { subject: 'German Language', minRate: 18, typicalRate: 30, premiumRate: 55, demandLevel: 'high' },
      { subject: 'English (EFL)', minRate: 20, typicalRate: 32, premiumRate: 60, demandLevel: 'high' },
      { subject: 'Sciences', minRate: 20, typicalRate: 33, premiumRate: 60, demandLevel: 'high' },
    ],
  },
];

// ============================================================================
// LISTING QUALITY CRITERIA
// ============================================================================

export const LISTING_QUALITY_CRITERIA: ListingQualityCriteria[] = [
  {
    id: 'title-specificity',
    category: 'Title',
    criterion: 'Title specifies subject + level + exam board (where applicable)',
    weight: 9,
    benchmark: '"GCSE Maths Tutor — AQA & Edexcel | Grade 9 Target" outperforms "Maths Tutor" by 3-5x in search ranking',
    failureSignal: 'Generic title e.g. "Maths Tutor" or "Science Tutor" with no level/exam board',
    fixSuggestion: 'Add: Level (Primary / GCSE / A-Level), Exam Board (AQA, Edexcel, OCR, CIE, IB), and outcome focus (Grade 9, Grade A*, results-focused)',
  },
  {
    id: 'description-length',
    category: 'Description',
    criterion: 'Description is 150–300 words (sweet spot for conversion)',
    weight: 8,
    benchmark: 'Tutors with 180-280 word descriptions have 40% higher enquiry rates than those under 80 words',
    failureSignal: 'Description under 80 words or over 400 words (over-optimised / overwhelming)',
    fixSuggestion: 'Cover: your teaching approach, qualifications, subjects taught, results achieved, and what a typical session looks like',
  },
  {
    id: 'exam-board-keywords',
    category: 'SEO Keywords',
    criterion: 'Description includes relevant exam board(s) and qualification names',
    weight: 8,
    benchmark: 'Listings mentioning AQA, Edexcel, or OCR rank 2-4 positions higher for subject-specific searches',
    failureSignal: 'No exam board keywords. Parents and students search by exam board name.',
    fixSuggestion: 'Add exam boards: AQA, Edexcel, OCR, WJEC (UK); Cambridge IGCSE, IB, AP, SAT, ACT (international). Match to your actual teaching.',
  },
  {
    id: 'qualification-mentioned',
    category: 'Credibility',
    criterion: 'Qualification or degree subject mentioned in description',
    weight: 9,
    benchmark: 'Listings mentioning a degree or QTS (Qualified Teacher Status) command 15-25% higher rates',
    failureSignal: 'No mention of degree, qualifications, or teaching experience',
    fixSuggestion: 'State: degree subject and university, any teaching qualification (QTS, PGCE, CELTA), and years of tutoring experience',
  },
  {
    id: 'result-mentioned',
    category: 'Social Proof',
    criterion: 'At least one specific result or success story mentioned',
    weight: 8,
    benchmark: '"Helped 15 students achieve Grade 7+ in GCSE Maths" converts 60% better than a description with no results',
    failureSignal: 'No mention of student outcomes, results, or success',
    fixSuggestion: 'Add a specific, honest result: number of students tutored, average grade improvement, exam board outcomes, or testimonial paraphrase',
  },
  {
    id: 'session-structure-described',
    category: 'Expectation Setting',
    criterion: 'Description explains what a typical session looks like',
    weight: 6,
    benchmark: 'Parents want to know what they are paying for before booking. Clarity reduces anxiety and increases conversion.',
    failureSignal: 'Listing says nothing about how sessions run — just generic "I am a dedicated tutor"',
    fixSuggestion: 'Describe format: "Sessions typically start with reviewing the previous topic, then we tackle new concepts together using worked examples, ending with independent practice." 2-3 sentences is sufficient.',
  },
  {
    id: 'pricing-competitive',
    category: 'Pricing',
    criterion: 'Rate is within 20% of regional benchmark for the level/subject',
    weight: 7,
    benchmark: 'Underpricing by >25% signals low quality to experienced parents. Overpricing by >40% reduces enquiry rate without enough reviews to justify.',
    failureSignal: 'Rate more than 25% below benchmark (underpricing) or more than 40% above benchmark without 10+ reviews',
    fixSuggestion: 'New tutors: price at benchmark median to build reviews. After 10 reviews: raise by £5-10. After CaaS 80+: price at top quartile.',
  },
  {
    id: 'availability-clarity',
    category: 'Booking Friction',
    criterion: 'Availability is clearly communicated (days/times or "flexible")',
    weight: 5,
    benchmark: 'Listings with no availability information have 20% higher enquiry-to-booking dropout',
    failureSignal: 'No mention of availability. Parent enquires, waits, finds tutor is unavailable at their preferred time.',
    fixSuggestion: 'State typical availability: "Available weekday evenings and Saturday mornings" or "Flexible — contact for availability."',
  },
  {
    id: 'cancellation-policy',
    category: 'Professionalism',
    criterion: 'Cancellation/rescheduling policy referenced or linked',
    weight: 5,
    benchmark: 'TTA guidance recommends tutors have a clear cancellation policy. 24-48hr notice is standard.',
    failureSignal: 'No cancellation policy. Risk of income loss from last-minute cancellations.',
    fixSuggestion: 'Add one sentence: "I require 24 hours notice for cancellations. Late cancellations may incur a partial fee." Full policy in your profile T&Cs.',
  },
  {
    id: 'dbs-mentioned',
    category: 'Safeguarding / Trust',
    criterion: 'DBS check (UK) / background check (international) status mentioned',
    weight: 8,
    benchmark: '67% of UK parents say DBS check is a deciding factor when choosing a tutor for under-16s (TTA survey)',
    failureSignal: 'No mention of DBS or safeguarding credentials. Parents teaching under-16s may choose a competitor who displays this.',
    fixSuggestion: 'UK: Add "Enhanced DBS checked" with certificate date. US: "Background checked." Australia: "Working with Children Check (WWCC) verified." UAE: "Police clearance certificate held."',
  },
  {
    id: 'profile-photo',
    category: 'First Impression',
    criterion: 'Professional profile photo (clear, well-lit, neutral background)',
    weight: 7,
    benchmark: 'Listings with a professional photo receive 35% more enquiries than those with a poor photo or no photo',
    failureSignal: 'No photo, informal group photo, sunglasses, or unclear image',
    fixSuggestion: 'Use a clear head-and-shoulders photo. Smile, plain background, good lighting. No filters needed.',
  },
  {
    id: 'first-lesson-offer',
    category: 'Conversion',
    criterion: 'Trial / first lesson offer mentioned (optional but conversion-positive)',
    weight: 4,
    benchmark: 'A free 15-minute intro call (not a free lesson) converts well without giving free work. Paid trials at full rate filter serious clients.',
    failureSignal: 'No first contact mechanism. Parent must book a full paid session immediately.',
    fixSuggestion: 'Consider: "I offer a free 15-minute intro call to discuss your child\'s needs before we start." This is lower commitment than a free lesson and filters casual enquiries.',
  },
];

// ============================================================================
// QUALIFICATION WEIGHTS (how much each qualification matters to parents)
// ============================================================================

export const QUALIFICATION_WEIGHTS: QualificationWeight[] = [
  {
    qualification: 'QTS — Qualified Teacher Status (UK)',
    countryContext: 'UK',
    trustSignal: 10,
    premiumJustification: 'Formal teaching qualification, Ofsted-aligned standards, DBS as standard. Parents trust QTS-holders as "real teachers".',
    notes: 'Awarded after PGCE or School Direct. Required to teach in UK state schools. Not required for private tutoring, but commands strong premium.',
  },
  {
    qualification: 'PGCE — Postgraduate Certificate in Education (UK)',
    countryContext: 'UK',
    trustSignal: 9,
    premiumJustification: 'University-level teacher training, specialist subject knowledge, practical classroom experience.',
    notes: 'Most common route to QTS in England. Scottish equivalent: PGDE.',
  },
  {
    qualification: 'Degree — Subject-relevant (First or 2:1)',
    countryContext: 'Global',
    trustSignal: 8,
    premiumJustification: 'Deep subject knowledge. Parents strongly prefer tutors with a degree in the subject being taught.',
    notes: 'Russell Group degree commands additional premium. Oxbridge degree is highest trust signal without QTS.',
  },
  {
    qualification: 'PhD — Doctoral Degree (subject-relevant)',
    countryContext: 'Global',
    trustSignal: 9,
    premiumJustification: 'Expert-level knowledge. Particularly valued for A-Level, university, and professional exam prep.',
    notes: 'Most effective for A-Level upwards. Less relevant / potentially intimidating for primary parents.',
  },
  {
    qualification: 'A* / A Grades in Subject (recent)',
    countryContext: 'UK',
    trustSignal: 7,
    premiumJustification: '"I got A* in this exam — I know how to pass it." Peer-level credibility, especially for GCSE tutors who are undergraduates.',
    notes: 'Particularly credible for tutors who are recent graduates (within 5 years of sitting the exam).',
  },
  {
    qualification: 'State Certified Teacher Licence (US)',
    countryContext: 'USA',
    trustSignal: 9,
    premiumJustification: 'State board certification. Equivalent to QTS in US context. Required for public school teachers.',
    notes: 'Varies by state. Common certifications: PRAXIS exam, state-specific licensure.',
  },
  {
    qualification: 'IB Teaching Certificate (International Baccalaureate)',
    countryContext: 'International / UK / UAE / HK / Singapore',
    trustSignal: 9,
    premiumJustification: 'Specialist IB curriculum knowledge. IB families specifically seek IB-trained tutors.',
    notes: 'IB Diploma tutors who themselves scored 40+ points command very high rates in international school markets.',
  },
  {
    qualification: 'CELTA / DELTA (English Language Teaching)',
    countryContext: 'Global — EAL / ESOL',
    trustSignal: 9,
    premiumJustification: 'Cambridge-accredited language teaching qualification. Gold standard for ESL/EFL tutors.',
    notes: 'CELTA: entry-level. DELTA: advanced. Both recognised globally. Especially valued in UAE, HK, Singapore.',
  },
  {
    qualification: 'ABRSM / Trinity Music Grade 8+',
    countryContext: 'UK / International',
    trustSignal: 8,
    premiumJustification: 'Professional music qualification. Parents trust graded exam success as proxy for teaching ability.',
    notes: 'ABRSM (Associated Board of the Royal Schools of Music) is UK gold standard. Grade 8 + practical experience = credible music tutor.',
  },
  {
    qualification: 'Working with Children Check / WWCC (Australia)',
    countryContext: 'Australia',
    trustSignal: 10,
    premiumJustification: 'Mandatory legal requirement in all Australian states for working with children. Non-negotiable.',
    notes: 'NSW: $80 for employees, valid 5 years. VIC: $127. QLD: Positive Notice (Blue Card). Must be displayed.',
  },
];

// ============================================================================
// SAFEGUARDING REQUIREMENTS BY COUNTRY
// ============================================================================

export const SAFEGUARDING_REQUIREMENTS: SafeguardingRequirement[] = [
  {
    country: 'UK',
    requirement: 'Enhanced DBS (Disclosure and Barring Service) Check',
    mandatory: true,
    cost: '£38 for standard check + £13/year for Update Service (continuous monitoring)',
    renewalPeriod: 'No official expiry — Update Service subscription recommended for continuous employers checking',
    authority: 'DBS (gov.uk/dbs-check-applicant-criminal-record)',
    notes: 'Required for "regulated activity" with under-16s. Umbrella bodies process applications faster (2-5 days vs 4-8 weeks direct). Enhanced DBS covers barred lists. The Update Service allows employers (including parents/agencies) to check DBS status without a new application.',
  },
  {
    country: 'England — National Tutoring Programme (NTP)',
    requirement: 'Enhanced DBS + safeguarding training + subject knowledge test (for approved Tuition Partners)',
    mandatory: true,
    cost: 'Borne by approved partner organisations',
    renewalPeriod: 'Annual review by DfE-approved partners',
    authority: 'UK Department for Education (DfE) — NTP transitioned to School-Led Tutoring from 2022',
    notes: 'NTP originally provided £18.14/hr funding for school-commissioned tutors (2023/24 rate). Programme wound down 2024. Legacy: normalised tutoring for disadvantaged pupils; many NTP-trained tutors now active in private market.',
  },
  {
    country: 'Scotland',
    requirement: 'PVG (Protecting Vulnerable Groups) Scheme — Scottish equivalent of DBS',
    mandatory: true,
    cost: '£18 for scheme membership (one-off for paid workers)',
    renewalPeriod: 'No expiry — continuous disclosure if new information arises',
    authority: 'Disclosure Scotland (mygov.scot)',
    notes: 'Scotland uses PVG, not DBS. Tutors working with Scottish children should hold PVG, not English DBS, for consistency.',
  },
  {
    country: 'USA',
    requirement: 'Background check (fingerprint-based in most states for school/org-employed tutors)',
    mandatory: false,
    cost: '$20-80 depending on state and check depth (LiveScan fingerprinting: $50-80)',
    renewalPeriod: 'Varies by state; typically 2-3 years for school-based roles',
    authority: 'FBI / state bureau (varies). Most platforms do Checkr or Sterling background checks.',
    notes: 'No federal mandatory requirement for independent private tutors. Wyzant and most platforms require a basic background check. Tutoring for school districts requires state-level clearance.',
  },
  {
    country: 'Australia',
    requirement: 'Working with Children Check (WWCC) — mandatory in all states',
    mandatory: true,
    cost: 'NSW: $80 (employees), free (volunteers) | VIC: $127 | QLD: Blue Card $107 | WA: $11 | SA: $110 | TAS: $20',
    renewalPeriod: 'NSW: 5 years | VIC: 5 years | QLD: 5 years | varies by state',
    authority: 'State government — each state has its own authority and card',
    notes: 'Required for ALL tutors working with children under 18. Cross-state recognition improving but not universal. Many tutors need to apply in multiple states if working remotely across state lines.',
  },
  {
    country: 'UAE',
    requirement: 'Police Clearance Certificate from country of origin + local residency visa',
    mandatory: false,
    cost: 'Varies by country of origin (UK: £65 ACRO certificate). UAE labour law governs employed tutors.',
    renewalPeriod: 'Usually required for each employment application',
    authority: 'KHDA (Knowledge and Human Development Authority) — regulates tutoring centres in Dubai',
    notes: 'Individual private tutors not regulated. Tutoring centres must be KHDA licensed. UK-based tutors serving UAE families online are not required to hold UAE clearance — UK DBS is usually accepted by UAE families.',
  },
  {
    country: 'Singapore',
    requirement: 'No specific national check for private tutors. MOE regulates tutoring centres.',
    mandatory: false,
    cost: 'N/A for individual tutors',
    renewalPeriod: 'N/A',
    authority: 'Ministry of Education Singapore (MOE) for registered centres only',
    notes: 'Individual private tutors in Singapore are not regulated. Registered tutoring centres must comply with MOE requirements. Most parents rely on referrals and platform reviews rather than formal checks.',
  },
];

// ============================================================================
// UK GOVERNMENT & EDUCATION POLICY CONTEXT
// ============================================================================

export const UK_EDUCATION_POLICY = {
  keyStages: {
    KS1: { years: 'Year 1-2', ages: '5-7', assessment: 'Teacher assessment + phonics check (Year 1)', notes: 'Phonics screening check in Year 1. Reading and numeracy baseline.' },
    KS2: { years: 'Year 3-6', ages: '7-11', assessment: 'SATs in Year 6 (Maths + English)', notes: 'SATs results used for secondary school banding. 11+ entrance exams sit in Year 6.' },
    KS3: { years: 'Year 7-9', ages: '11-14', assessment: 'Internal school assessments, no national exam', notes: 'Transition year — tutoring demand from parents who want to prevent academic drift.' },
    KS4: { years: 'Year 10-11', ages: '14-16', assessment: 'GCSE examinations (May/June Year 11)', notes: 'Highest volume tutoring market. GCSE Maths & English passes required for most college/training courses.' },
    KS5: { years: 'Year 12-13', ages: '16-18', assessment: 'A-Levels, BTECs, International Baccalaureate', notes: 'UCAS points determine university admissions. Oxbridge, medicine, law are elite paths with separate entry requirements.' },
  },
  gcsePolicy: {
    resitPolicy: 'Students who fail GCSE Maths or English (below grade 4/C) must continue studying and resitting until age 19. This creates a year-round resit market.',
    gradingSystem: 'Grades 9-1 (England); A*-G still used in Wales and Northern Ireland. Grade 4 is "standard pass", Grade 5 is "strong pass".',
    examBoards: ['AQA (largest, ~50% of entries)', 'Edexcel / Pearson (second largest)', 'OCR', 'WJEC / Eduqas (mainly Wales)', 'Cambridge Assessment / CIE (for IGCSE in private schools)'],
  },
  aLevelPolicy: {
    ucasPoints: 'A* = 56, A = 48, B = 40, C = 32, D = 24, E = 16 UCAS points. Universities set minimum UCAS point requirements.',
    russellGroup: 'Russell Group (24 universities including Oxford, Cambridge, UCL, Imperial) typically require AAA or above at A-Level. Medicine requires AAA plus UCAT/BMAT.',
    oxbridgeEntrance: 'Oxford and Cambridge require A*AA or above plus admission tests: MAT (Maths), PAT (Physics), TSA (Thinking Skills), ELAT (English), HAT (History), LNAT (Law).',
    epq: 'Extended Project Qualification (EPQ) valued by universities — equivalent to half an A-Level. Some tutors offer EPQ mentoring as a premium add-on.',
  },
  ofstedContext: {
    doesOfstedRegulatePrivateTutors: false,
    relevantFramework: 'Independent tutors are not inspected or regulated by Ofsted. Ofsted inspects registered independent schools and tutoring companies operating as schools.',
    practicalImplication: 'Tutors should not claim Ofsted inspection or rating. DBS + TTA membership are the meaningful quality signals parents understand.',
    senPolicy: 'EHC Plans (Education, Health and Care Plans) for pupils with SEND — some local authorities fund additional tutor support for EHC Plan pupils. SENCo (Special Educational Needs Coordinator) at schools may recommend tutors.',
  },
  ntp: {
    status: 'The National Tutoring Programme officially wound down after academic year 2023/24. School-Led Tutoring remains the vehicle for some DfE-funded tutoring via Pupil Premium.',
    pupilPremium: 'Schools receive Pupil Premium funding (£1,480 per pupil 2023/24 for eligible pupils) to close disadvantage gap. Some headteachers commission private tutors using Pupil Premium.',
    headteacherInsight: 'Tutors who can position themselves as Pupil Premium-eligible providers (evidence-based practice, measurable outcomes, SEND experience) can access school contracts.',
    recoveryPremium: 'COVID Recovery Premium ended 2023/24. Its legacy is that low-income families are now more aware of and open to private tutoring.',
  },
};

// ============================================================================
// US & EU GOVERNMENT EDUCATION POLICY CONTEXT
// ============================================================================

export const US_EDUCATION_POLICY = {
  system: 'Education is state-controlled in the USA. Federal government sets broad guidelines through the Every Student Succeeds Act (ESSA, 2015). No national curriculum, but Common Core State Standards adopted by most states.',
  keyExams: {
    SAT: 'Scholastic Assessment Test — primary college admissions test. 1600 max score (800 Math, 800 Evidence-Based Reading/Writing). Administered by College Board. Test dates: Aug, Oct, Nov, Mar, May, Jun.',
    ACT: 'American College Testing — alternative college admissions test. 36 max composite score. Administered by ACT Inc. Test dates: Feb, Apr, Jun, Jul, Sep, Oct, Dec.',
    AP: 'Advanced Placement — college-level courses and exams. Scores 1-5. Score 3+ may earn college credit. 38 AP subjects available. Exams in May.',
    IB: 'International Baccalaureate — used in ~900 US high schools. Scores 1-7 per subject, 45 total. Diploma requires 6 subjects + core.',
    PSAT: 'Pre-SAT / National Merit Scholarship Qualifying Test — Year 10-11 (Sophomore/Junior). High scorers qualify for National Merit Scholarship. Important for college admissions narrative.',
  },
  federalPrograms: {
    titleI: 'Title I funding goes to high-poverty schools. Some Title I schools hire tutoring providers using federal funds.',
    essa: 'Every Student Succeeds Act (2015) requires evidence-based interventions. Tutoring companies must demonstrate research-based practice to access school contracts.',
    noChildLeftBehind: 'Replaced by ESSA but its legacy is Supplemental Educational Services (SES) — tutoring funded by federal dollars for low-income students. Some legacy SES contracts remain.',
  },
};

export const EU_EDUCATION_POLICY = {
  isced: 'ISCED (International Standard Classification of Education) — UNESCO framework used by all EU countries to classify educational programmes. ISCED 1 = Primary, 2 = Lower Secondary, 3 = Upper Secondary, 4 = Post-Secondary, 5-8 = Tertiary.',
  keyQualifications: {
    germany: 'Abitur (university entrance qualification, Grade 12/13). Intermediate qualifications: Realschulabschluss (Grade 10), Hauptschulabschluss (Grade 9). Private tutoring (Nachhilfe) is mainstream — ~30% of German students receive it.',
    france: 'Baccalauréat (Bac) — national exam at end of Lycée (Year 12). Replaced graded subjects with continuous assessment reform 2021. Tutoring (soutien scolaire) large market (~€2.3bn/yr). Platform Superprof strongest in France.',
    netherlands: 'VWO/HAVO/VMBO track system — students are placed in different academic tracks at age 12. Bijles (private tutoring) common especially around track placement exams.',
    spain: 'Bachillerato (Years 11-12) + EBAU/EVAU university entrance exam. Private tutoring (clases particulares) embedded in culture. Superprof Spain largest platform.',
    italy: 'Esame di Stato (Maturità) — final secondary exam. Ripetizioni (private tutoring) widespread, especially for university entrance exams (medicina, legge).',
  },
  gdprImplications: 'Tutors operating in the EU (or tutoring EU-resident students) must comply with GDPR. For tutors: maintain a simple data register, have a privacy notice, don\'t store unnecessary personal data of students/minors. Platforms handle GDPR compliance for listings.',
};

// ============================================================================
// UK TUTOR COMMUNITY — COMMON QUESTIONS & PAIN POINTS
// (sourced from TTA, TutorHunt forums, Reddit r/uktutors, Facebook "Tutors UK")
// ============================================================================

export const TUTOR_PAIN_POINTS = {
  pricing: [
    { question: 'How do I know what to charge as a new tutor?', insight: 'Most new tutors underprice by 20-40%. Use benchmark median for your level/subject/region. Underpricing attracts price-sensitive clients who are harder to retain.' },
    { question: 'Should I lower my rate to get my first clients?', insight: 'No — lower rates attract lower-commitment clients. Better strategy: offer a free 15-min intro call (not a free lesson) to reduce booking friction without discounting.' },
    { question: 'When and how do I raise my rates without losing students?', insight: 'Raise rates for NEW clients immediately. Give existing clients 4-6 weeks notice of a modest increase (£5-10/hr). Most long-term clients stay. Phrase it as "I\'m updating my rates to reflect my experience."' },
    { question: 'Do I charge for a no-show?', insight: 'TTA recommends: yes, for last-minute cancellations (under 24hr). Charge 50-100% of session fee. Set this expectation in your T&Cs before the first session.' },
  ],
  clientAcquisition: [
    { question: 'Which platform is best — MyTutor, TutorHunt, Superprof, Bark.com?', insight: 'MyTutor: largest UK platform for school-age students (GCSE/A-Level), lower rates (~£22-35/hr net after commission). TutorHunt: older platform, more varied rates. Superprof: global, French-owned. Bark.com: lead generation, not a marketplace — clients pay for leads. Best strategy: start on 2-3 platforms, then move clients to direct.' },
    { question: 'How do I get off platforms and build my own client base?', insight: 'After 6-12 months on a platform with 5+ reviews: mention your own website to students (if platform allows). Build a simple Google-indexed website with your referral link. Word-of-mouth is the primary direct channel.' },
    { question: 'How long until I get my first student?', insight: 'New tutors typically wait 2-8 weeks for their first booking on platforms. Fastest route: be active on multiple platforms simultaneously, respond within 1 hour to enquiries, complete your profile 100%.' },
  ],
  retention: [
    { question: 'Student went quiet after 3 sessions — how do I re-engage?', insight: 'Send a brief check-in message: "Hope revision is going well — I have availability next week if you\'d like to pick up where we left off." One message is appropriate; do not follow up more than once.' },
    { question: 'Parents want to pause over summer — how do I handle it?', insight: 'Summer pause is normal. Offer "summer skills" sessions (exam board changes, university prep, 11+ early start) as alternative to generic sessions. Proactively reach out in August for September return.' },
  ],
  reviews: [
    { question: 'How do I ask for a review without being awkward?', insight: 'Ask immediately after a milestone: "I\'m so glad you got your Grade 7! If you have a spare moment, a quick Google review would really help — here\'s the link." Timing is everything — the moment of result celebration is optimal.' },
    { question: 'Should I ask for Google reviews or platform reviews?', insight: 'Both. Platform reviews help with ranking on that platform. Google reviews help with SEO for direct client acquisition. Google reviews are more durable and portable.' },
  ],
  marketing: [
    { question: 'What marketing actually works for tutors?', insight: 'Ranked by ROI: (1) Referrals from existing students, (2) Google Maps + reviews, (3) Nextdoor app (for local in-person), (4) Local Facebook parent groups, (5) LinkedIn (adult/professional learners), (6) Instagram study content (slower, awareness only).' },
    { question: 'Should I specialise or tutor all subjects?', insight: 'Specialisation beats generalism for income: a specialist "AQA GCSE Chemistry" tutor commands 30-50% premium over a generic "Science tutor" and gets more organic referrals from parents who search specifically.' },
  ],
};

// ============================================================================
// DSPy-STYLE AUDIT SIGNATURES
// ============================================================================

export const PROFILE_AUDIT_SIGNATURE: ListingAuditSignature = {
  name: 'TutorProfileAudit',
  description: 'Audit a tutor profile and listings, identify specific weaknesses, and generate prioritised improvement recommendations with estimated revenue impact',
  inputs: ['profile_data', 'listings', 'bookings', 'reviews', 'caas_score', 'region', 'active_role'],
  outputs: ['score', 'top_issues', 'quick_wins', 'revenue_impact_estimate', 'action_plan'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        profile_data: { full_name: 'James Chen', bio: 'I am a maths tutor. I have a degree.', avatar_url: null, verified: false },
        listings: [{ title: 'Maths Tutor', price_per_hour: 28, description: 'I teach maths to all ages.', subjects: ['Maths'], delivery_mode: ['online'] }],
        bookings: { total: 2, completion_rate: 1.0 },
        reviews: [],
        caas_score: 45,
        region: 'London',
        active_role: 'tutor',
      },
      outputs: {
        score: 31,
        top_issues: [
          'No profile photo — London tutors with a photo get 35% more enquiries',
          'Listing title "Maths Tutor" is generic — 847 London tutors use similar titles',
          'Price £28/hr is 43% below London GCSE Maths benchmark of £65/hr — signals low quality to experienced parents',
          'Bio is 12 words — top-converting London tutors write 180-250 words',
          'No exam board mentioned — parents and students search by AQA/Edexcel specifically',
          'No DBS check mentioned — required for 67% of London parents for under-16s',
          'Zero reviews — new profiles need minimum 3 reviews to convert reliably',
        ],
        quick_wins: [
          'Upload a professional photo (do today, immediate impact)',
          'Rewrite title: "GCSE & A-Level Maths | AQA & Edexcel | Grade 9 Specialist — London"',
          'Raise price to £45/hr (still below median, but removes "too cheap = suspect" signal). After 3 reviews: £55/hr.',
          'Expand bio to 180+ words covering: degree from [university], subjects, approach, results',
          'Ask your 2 existing students for a Google review this week',
        ],
        revenue_impact_estimate: 'Price correction to £45/hr + 2 more bookings from improved listing = +£340/month estimated',
        action_plan: 'Priority 1: Photo + title rewrite (today). Priority 2: Price to £45 + bio expansion (this week). Priority 3: DBS mention + reviews ask (this month).',
      },
      reasoning: 'London market is competitive but premium. James is severely underpricing and under-presenting himself. The primary issue is not lack of skills but lack of professional presentation. Quick wins first: photo and title are zero-cost and immediate. Pricing correction unlocks the single largest revenue gain.',
    },
    {
      inputs: {
        profile_data: { full_name: 'Sarah Okonkwo', bio: '15+ years experienced English teacher (QTS, PGCE). Former Head of English at Highgate School. I help GCSE and A-Level students master the skills examiners are looking for.', avatar_url: 'https://...', verified: true },
        listings: [
          { title: 'GCSE English Language & Literature Tutor | AQA & Edexcel', price_per_hour: 55, description: 'Experienced English teacher...', subjects: ['English Language', 'English Literature'], delivery_mode: ['online', 'in-person'] },
        ],
        bookings: { total: 47, completion_rate: 0.97 },
        reviews: [{ rating: 5, count: 23 }],
        caas_score: 88,
        region: 'London',
        active_role: 'tutor',
      },
      outputs: {
        score: 84,
        top_issues: [
          'Price £55/hr is below the London A-Level English benchmark of £75/hr for tutors with QTS + 15yr experience + 23 reviews',
          'Listing description does not mention specific exam board techniques (e.g. "AQA Language Paper 1 Question 5 creative writing" specifics)',
          'No mention of 11+ or Oxbridge personal statement prep — adjacent premium market she is likely qualified for',
        ],
        quick_wins: [
          'Raise price to £70/hr for new bookings immediately — your CaaS 88 and 23 reviews justify top-quartile pricing',
          'Add one sentence to description: "I specialize in AQA Paper 1 creative writing and AQA Paper 2 writer\'s viewpoint — the two most commonly dropped marks at GCSE."',
          'Create a separate listing for "Oxbridge English Personal Statement Mentoring" at £100/hr — 2-4 session engagement, premium niche',
        ],
        revenue_impact_estimate: 'Price correction to £70/hr on new clients + Oxbridge PS listing = +£280/month estimated',
        action_plan: 'You are a premium-tier tutor presenting at mid-tier pricing. Primary action: raise rates. Secondary: add specificity to attract high-intent searches.',
      },
      reasoning: 'Sarah is a highly qualified tutor significantly underpricing herself. Her CaaS score, review count, and credentials all justify top-quartile London pricing. The main audit finding is not quality gaps but pricing conservatism — common among experienced tutors who fear client loss. Evidence shows that at her credential level, price increases reduce volume but increase net income.',
    },
  ],
};

export const LISTING_SEO_SIGNATURE: ListingAuditSignature = {
  name: 'ListingSEOOptimiser',
  description: 'Analyse a listing title and description for UK/international tutoring marketplace SEO, generate improved version with specific keyword suggestions',
  inputs: ['current_title', 'current_description', 'subject', 'level', 'exam_boards', 'region'],
  outputs: ['seo_score', 'improved_title', 'improved_description', 'keywords_added', 'keywords_missing'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        current_title: 'Maths Tuition',
        current_description: 'Hi, I am a qualified maths teacher with 5 years experience. I can help with all topics.',
        subject: 'Maths',
        level: 'GCSE',
        exam_boards: ['AQA', 'Edexcel'],
        region: 'Manchester',
      },
      outputs: {
        seo_score: 22,
        improved_title: 'GCSE Maths Tutor Manchester — AQA & Edexcel | Grade 7-9 Specialist',
        improved_description: 'I\'m a qualified maths teacher (QTS, 5 years classroom experience) specialising in GCSE Maths for AQA and Edexcel exam boards.\n\nI focus on the topics where students lose the most marks: algebra, quadratics, ratio and proportion, and trigonometry. Every session is structured: we identify gaps using past paper analysis, work through concepts with worked examples, then consolidate with exam-style questions.\n\nStudents I work with typically improve by 1-2 grades within 8-12 sessions. If your child is targeting Grade 7-9, I help build the precision and exam technique that top grades require.\n\nI offer a free 15-minute intro call so we can discuss your child\'s needs before committing. DBS Enhanced checked (March 2024). Available weekday evenings and weekend mornings.',
        keywords_added: ['GCSE', 'AQA', 'Edexcel', 'Grade 7-9', 'exam technique', 'past paper', 'algebra', 'trigonometry', 'DBS checked', 'Manchester'],
        keywords_missing: ['foundation tier / higher tier', 'Year 10 / Year 11', 'resit', 'grade improvement'],
      },
      reasoning: 'The original title and description lack specificity on every dimension that parents search by: level (GCSE), exam board (AQA/Edexcel), location (Manchester), outcome (grade target). The improved version adds all four plus key topic areas and trust signals (QTS, DBS, structured approach, results). Length increased from 32 words to 180 words — within the optimal 150-280 word range.',
    },
  ],
};
