/**
 * Growth Agent — Core Skill: Business Setup & Compliance
 *
 * The knowledge base for tutors making career and business decisions:
 * going full-time, registering as a business, understanding their legal
 * obligations, creating T&Cs, and protecting themselves professionally.
 *
 * This is one of the Growth Agent's highest-value capabilities — these
 * are the questions tutors ask repeatedly in forums, Facebook groups, and
 * Reddit r/uktutors that NO tutoring platform currently answers well.
 *
 * This file also covers career transition mechanics: the "Should I leave
 * teaching?" question from first principles.
 *
 * Sources:
 *   - HMRC: gov.uk (self-assessment, VAT, expenses, MTD)
 *   - Companies House: companieshouse.gov.uk
 *   - UK Employment Rights Act 1996 (notice periods)
 *   - STPCD (School Teachers' Pay and Conditions Document) 2024/25
 *   - The Tutors' Association (TTA) Code of Professional Conduct
 *   - UK GDPR / Data Protection Act 2018 (ICO guidance)
 *   - US IRS (self-employment for US-based tutors)
 *   - Australian ATO (self-employment, ABN registration)
 *   - EU GDPR / ePrivacy Directive (for EU-based tutors)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CareerDecisionFramework {
  question: string;
  answer: string;
  nuance: string;
  keyFactors: string[];
  commonMistakes: string[];
  resources: string[];
}

export interface RegistrationStep {
  country: string;
  structure: string;
  step: number;
  action: string;
  where: string;
  cost: string;
  timeRequired: string;
  notes: string;
}

export interface TCSection {
  sectionName: string;
  importance: 'essential' | 'recommended' | 'optional';
  description: string;
  sampleLanguage: string;
  legalBasis?: string;
  commonMistake: string;
}

export interface ComplianceObligation {
  obligation: string;
  applies: string;
  authority: string;
  consequences: string;
  howToComply: string;
  isCommon: boolean;
}

// ============================================================================
// CAREER DECISION FRAMEWORKS
// ============================================================================

export const CAREER_DECISIONS: CareerDecisionFramework[] = [
  {
    question: 'Should I leave teaching and tutor full-time?',
    answer: 'Not yet for most tutors — and the timing matters enormously. The question is not "can I earn enough?" but "have I built enough of a pipeline to survive the summer gap and unexpected student churn?"',
    nuance: 'The tutors who regret going full-time typically jumped when they had 10-12 regular students and less than 3 months cash reserve. The tutors who succeed typically had 15-20+ regular students, 6 months savings, and left at the end of a summer term (maximising the September intake runway).',
    keyFactors: [
      'Your monthly tutoring income vs monthly expenses (you need 20%+ buffer after tax)',
      'Client base stability — how many are year-round vs seasonal (GCSE/A-Level year only)?',
      'Cash reserve — can you survive a bad July/August (50-60% income drop)?',
      'Inbound demand — are you turning students away? That is the clearest green light.',
      'Your pension — teachers\' pension is one of the most valuable employee benefits in the UK; model the long-term cost of leaving it',
      'Your mortgage/rental situation — lenders count self-employment income differently (often require 2-3 years of accounts)',
    ],
    commonMistakes: [
      'Going full-time in January rather than September — you miss the biggest intake month',
      'Not giving proper notice to your school (risks burning bridges that could later refer students)',
      'Leaving before you have a business bank account, invoicing system, and HMRC registration',
      'Overestimating how quickly you can replace lost students — it takes 4-8 weeks per new student acquisition',
      'Forgetting about pension, sick pay, and holiday pay — these add ~25-30% to the true cost of employed income',
    ],
    resources: [
      'MoneySavingExpert self-employment tax calculator (moneysavingexpert.com)',
      'TTA guidance for full-time tutors (thetutorsassociation.org.uk)',
      'HMRC: gov.uk/set-up-sole-trader',
      'The "Tutor Full-Time Transition Checklist" (in revenue-intelligence skill file)',
    ],
  },
  {
    question: 'Should I set up as a sole trader or limited company?',
    answer: 'Sole trader for almost all tutors earning under £50,000-55,000/year. Limited company above that threshold, but only with an accountant\'s advice for your specific circumstances.',
    nuance: 'The tax saving from a limited company is real but often overstated. At £40,000 profit, the tax saving might be £1,500-2,000 — but accountancy fees alone are £600-1,200/year. The net benefit is often under £1,000, while the admin burden is significantly higher. The crossover point where Ltd genuinely wins is typically £55,000+ gross profit.',
    keyFactors: [
      'Annual gross profit from tutoring (not turnover — profit after allowable expenses)',
      'Other income (part-time employment affects the calculation significantly)',
      'Plans to employ others or have complex business structure',
      'Whether you want to retain profits in the company rather than take them as income',
      'Mortgage applications in next 2 years (lenders treat limited company directors differently)',
    ],
    commonMistakes: [
      'Incorporating too early — most tutors who set up a Ltd company under £40k income gain nothing net after accountancy costs',
      'Not understanding that company money is not personal money — directors must pay themselves via payroll + dividends',
      'Forgetting that dividend allowance dropped from £2,000 to £500 in 2023/24',
      'Not taking advice from a qualified accountant before making the decision',
    ],
    resources: [
      'HMRC sole trader guide: gov.uk/set-up-sole-trader',
      'Companies House: companieshouse.gov.uk/register',
      'HMRC Corporation Tax: gov.uk/corporation-tax',
      'TaxCalc / GoSimpleTax for self-assessment filing (affordable for sole traders)',
      'FreeAgent — free with NatWest/RBS/Ulster Bank business account; includes MTD compliance',
    ],
  },
  {
    question: 'When should I raise my tutoring rates?',
    answer: 'Sooner than you think. Most tutors undercharge for too long. Rate increases are easiest when delivered: (1) at the start of a new academic year, (2) after a student achieves a milestone, (3) when adding new qualifications or credentials.',
    nuance: 'Research consistently shows that 70-80% of long-term students stay when rates are raised by £5-10/hr with adequate notice. The ones who leave were often the most price-sensitive and least committed clients anyway. Higher rates attract better clients who value the service more highly.',
    keyFactors: [
      'Are you at or below the benchmark for your subject, level, and region?',
      'Do you have 10+ positive reviews? If yes, you can price at the top quartile.',
      'Are you turning students away due to being fully booked? That is the clearest signal to raise rates — supply and demand.',
      'How long since your last rate increase? Annual increases of £3-5/hr are normal and expected.',
    ],
    commonMistakes: [
      'Raising rates by surprise without notice — give existing students 4-6 weeks notice',
      'Applying increases to existing long-term loyal clients too aggressively — consider grandfathering at old rate for 1 term',
      'Not raising rates for new clients when your bookings are full — you are leaving money on the table',
      'Guilt-based underpricing — particularly common among female tutors (documented in tutoring industry research)',
    ],
    resources: [
      'MyTutor market rate checker (mytutor.co.uk/market)',
      'Superprof rate comparison by subject (superprof.co.uk)',
      'Tutorwise marketplace benchmarks — compare directly in the platform',
    ],
  },
  {
    question: 'Should I register for VAT?',
    answer: 'Mandatory only if your tutoring TURNOVER (not profit) exceeds £90,000 in any rolling 12-month period (2024/25 threshold). Voluntary registration possible below threshold but rarely advisable for individual tutors.',
    nuance: 'Important: individual private tutoring by a sole trader providing "tuition in a subject ordinarily taught in school or university" may qualify for VAT EXEMPTION under VATA 1994 Sch 9 Group 6. This is a complex area. HMRC guidance says the key test is whether you are an "eligible body" — sole trader individual tutors to individual students likely qualify for exemption. Tutoring companies typically do not. Get an accountant\'s view before assuming exemption applies.',
    keyFactors: [
      'Your turnover (total income before expenses) — not profit',
      'Whether your specific tutoring service qualifies for VAT exemption (seek professional advice)',
      'VAT registration would require charging clients 20% VAT on top of your rate — major competitive disadvantage',
      'Group tutoring, corporate training, and tutoring through a limited company have different VAT treatment',
    ],
    commonMistakes: [
      'Confusing turnover with profit — VAT threshold is on gross income, not net profit',
      'Assuming exemption without checking — incorrect VAT treatment can result in backdated HMRC bills',
      'Not monitoring turnover monthly — the 12-month rolling period can catch tutors by surprise in peak seasons',
    ],
    resources: [
      'HMRC VAT Notice 701/30: Education and vocational training (gov.uk)',
      'HMRC VAT registration: gov.uk/vat-registration',
      'ICB Accountants directory for local advice (bookkeepers.org.uk)',
    ],
  },
  {
    question: 'What should I do about the teaching pension if I leave?',
    answer: 'Do not leave it in the scheme dormant — understand your options. The Teachers\' Pension Scheme (TPS) is a Defined Benefit (DB) pension — one of the most valuable in the UK. Leaving it behind is a real financial cost.',
    nuance: 'The Teachers\' Pension (England & Wales) accrual rate is 1/57th of average salary per year of service. A teacher with 10 years service earning £40,000 has accrued ~£7,017/year pensionable income from age 68. That\'s the equivalent of a private pension pot of approximately £150,000-175,000 at current annuity rates. Factor this into your full-time tutoring income target.',
    keyFactors: [
      'How many years of pensionable service you have accrued',
      'Whether you can transfer out (not always advisable — TPS is hard to beat)',
      'Whether you will continue making State Pension contributions as a self-employed person (Class 4 NI)',
      'Whether you are eligible to buy back years via voluntary contributions later',
      'State Pension: 35 qualifying NI years needed for full State Pension (£11,502/year in 2024/25)',
    ],
    commonMistakes: [
      'Assuming the pension is "lost" when you leave teaching — accrued benefits are preserved (deferred)',
      'Not getting an up-to-date pension statement before leaving',
      'Leaving without understanding the final salary vs career average distinction in TPS',
    ],
    resources: [
      'Teachers\' Pension Scheme: teacherspensions.co.uk',
      'HMRC NI record: check via personal tax account (gov.uk/check-state-pension)',
      'Pension Wise (government guidance service): moneyhelper.org.uk/pension-wise',
    ],
  },
];

// ============================================================================
// REGISTRATION STEPS BY COUNTRY
// ============================================================================

export const REGISTRATION_STEPS: RegistrationStep[] = [
  // UK — Sole Trader
  { country: 'UK', structure: 'Sole Trader', step: 1, action: 'Check if you need to register', where: 'gov.uk/check-if-you-need-send-self-assessment-tax-return', cost: 'Free', timeRequired: '5 min', notes: 'If tutoring income exceeds £1,000/year: you must register for Self Assessment. Most people tutoring even part-time need to register.' },
  { country: 'UK', structure: 'Sole Trader', step: 2, action: 'Register for Self Assessment with HMRC', where: 'gov.uk/register-for-self-assessment', cost: 'Free', timeRequired: '10-15 min', notes: 'Register by 5 October following the tax year you first earned above the threshold. You\'ll receive a UTR (Unique Taxpayer Reference) within 10 working days by post.' },
  { country: 'UK', structure: 'Sole Trader', step: 3, action: 'Open a dedicated business bank account', where: 'Any UK bank — Monzo, Starling, HSBC Business (free)', cost: 'Free (many free business accounts available)', timeRequired: '1-3 days', notes: 'Not legally required but essential for clean bookkeeping. Starling and Monzo offer free business accounts. Gives you NatWest/RBS/Ulster Bank for free FreeAgent accounting software.' },
  { country: 'UK', structure: 'Sole Trader', step: 4, action: 'Set up basic bookkeeping', where: 'FreeAgent (free with some banks), QuickBooks (£12/month), spreadsheet', cost: 'Free-£15/month', timeRequired: '30 min setup', notes: 'Track all income and allowable expenses. Essential for: (1) knowing your true profit, (2) filing accurate Self Assessment, (3) MTD compliance from April 2026.' },
  { country: 'UK', structure: 'Sole Trader', step: 5, action: 'Set aside tax reserves each month', where: 'Separate savings account for tax', cost: 'Free', timeRequired: 'Ongoing', notes: 'Set aside 25-30% of gross income each month. HMRC bills can arrive as one large payment — the "payments on account" system means your second year bill can be 1.5x the first year\'s tax bill.' },
  { country: 'UK', structure: 'Sole Trader', step: 6, action: 'File annual Self Assessment return', where: 'gov.uk/file-your-self-assessment-tax-return', cost: 'Free to file; tax owed varies', timeRequired: '1-3 hours annually', notes: 'Deadline: 31 January (online). Tax year: 6 April to 5 April. Late filing penalty: £100 minimum, escalating after 3 months, 6 months, 12 months.' },
  // UK — Limited Company
  { country: 'UK', structure: 'Limited Company', step: 1, action: 'Reserve a company name', where: 'companieshouse.gov.uk (WebFiling or formation agent)', cost: '£12 online / £40 same day', timeRequired: '24-48 hours', notes: 'Name must be unique — check availability on Companies House. Cannot be misleading about company size or status.' },
  { country: 'UK', structure: 'Limited Company', step: 2, action: 'Choose your Memorandum and Articles of Association', where: 'Companies House model articles (free)', cost: 'Free (model articles) or solicitor £200-500 (bespoke)', timeRequired: '30 min', notes: 'Model articles are standard and suitable for most small businesses. Bespoke articles needed only for complex shareholder arrangements.' },
  { country: 'UK', structure: 'Limited Company', step: 3, action: 'Register with Companies House', where: 'companieshouse.gov.uk/register', cost: '£12 online', timeRequired: '24-48 hours for approval', notes: 'You\'ll need: registered office address (must be in UK; can use accountant\'s address), director details, shareholder details. Registration confirms by email.' },
  { country: 'UK', structure: 'Limited Company', step: 4, action: 'Register for Corporation Tax', where: 'gov.uk/limited-company-formation/set-up-corporation-tax', cost: 'Free', timeRequired: '10 min', notes: 'Must register within 3 months of starting to trade. CT must be paid within 9 months and 1 day of company year end.' },
  { country: 'UK', structure: 'Limited Company', step: 5, action: 'Set up payroll (PAYE) for director salary', where: 'HMRC payroll software (Basic PAYE Tools — free)', cost: 'Free or via payroll bureau £15-40/month', timeRequired: '1-2 hours setup', notes: 'Even if paying yourself below the NI threshold, you must register a PAYE scheme. Recommended director salary: £12,570/year (2024/25 personal allowance — full income tax relief, minimal NI).' },
  { country: 'UK', structure: 'Limited Company', step: 6, action: 'Appoint an accountant', where: 'ICAEW find-an-accountant directory, Xero advisor directory', cost: '£500-1,200/year for basic limited company accounts', timeRequired: 'Ongoing', notes: 'Essential for Ltd companies. Annual accounts + CT600 + director self-assessment + payroll is too complex for most people without professional support.' },
  // USA — Sole Proprietor
  { country: 'USA', structure: 'Sole Proprietor (Self-Employed)', step: 1, action: 'Obtain SSN or ITIN if needed', where: 'SSA.gov (SSN) or irs.gov (ITIN for non-citizens)', cost: 'Free', timeRequired: 'Varies', notes: 'US citizens already have SSN. Foreign nationals need ITIN to file US taxes.' },
  { country: 'USA', structure: 'Sole Proprietor (Self-Employed)', step: 2, action: 'File Schedule C with annual tax return (Form 1040)', where: 'IRS.gov or via TurboTax, H&R Block, FreeTaxUSA', cost: 'Free (IRS Free File if income under $79,000) or $30-80 for software', timeRequired: '2-4 hours annually', notes: 'Schedule C reports self-employment income and expenses. Attach to Form 1040. Self-employment tax (SE Tax): 15.3% on net self-employment income (equivalent of employer + employee FICA).' },
  { country: 'USA', structure: 'Sole Proprietor (Self-Employed)', step: 3, action: 'Pay quarterly estimated taxes', where: 'IRS Direct Pay: irs.gov/payments', cost: 'Free', timeRequired: 'Quarterly (April 15, June 15, Sept 15, Jan 15)', notes: 'Required if you expect to owe $1,000+ in federal taxes. State quarterly payments also required in most states. Underpayment penalty applies if you underpay.' },
  { country: 'USA', structure: 'Sole Proprietor (Self-Employed)', step: 4, action: 'Obtain EIN (optional but recommended)', where: 'IRS EIN application: irs.gov/businesses/small-businesses', cost: 'Free', timeRequired: 'Online: instant', notes: 'EIN is optional for sole proprietors with no employees but helps keep SSN private on forms and simplifies business banking.' },
  // Australia — ABN Registration
  { country: 'Australia', structure: 'Sole Trader (ABN)', step: 1, action: 'Apply for ABN (Australian Business Number)', where: 'abr.business.gov.au/ABN/Apply', cost: 'Free', timeRequired: '5-10 min (issued instantly online for most)', notes: 'Required for all businesses in Australia. Without ABN, clients can withhold 47% tax from payments (top marginal rate). Your ABN must appear on all invoices.' },
  { country: 'Australia', structure: 'Sole Trader (ABN)', step: 2, action: 'Consider GST registration', where: 'ato.gov.au/business/gst', cost: 'Free', timeRequired: '10 min', notes: 'GST registration mandatory if turnover exceeds AUD $75,000/year. Voluntary registration possible below threshold. Educational tutoring services are NOT GST-exempt in Australia (unlike UK VAT exemption).' },
  { country: 'Australia', structure: 'Sole Trader (ABN)', step: 3, action: 'Lodge annual tax return', where: 'ATO myTax (ato.gov.au/mytax) or via registered tax agent', cost: 'Free (myTax) or $150-300 (tax agent)', timeRequired: 'Deadline: 31 October (or May 15 via tax agent)', notes: 'Business income and expenses reported in individual tax return. Sole trader: no separate business tax return.' },
  { country: 'Australia', structure: 'Sole Trader (ABN)', step: 4, action: 'Register for Working with Children Check', where: 'State government — each state has different authority', cost: 'NSW: $80 employees, free volunteers. VIC: $127. QLD: $107.', timeRequired: '1-4 weeks processing', notes: 'Mandatory for all tutors working with under-18s. State-specific — does not transfer between states. Apply well in advance.' },
];

// ============================================================================
// TERMS & CONDITIONS — COMPLETE GUIDE FOR TUTORS
// ============================================================================

export const TUTOR_TC_GUIDE: TCSection[] = [
  {
    sectionName: '1. Services Description',
    importance: 'essential',
    description: 'Clearly describe what you provide: subject(s), level(s), session format (online/in-person), typical session structure.',
    sampleLanguage: '"I provide private one-to-one tutoring in [GCSE/A-Level] [Subject] via online video session (Zoom/Google Meet) or in-person at [your/student\'s location]. Sessions are typically [50/60] minutes and focus on [exam preparation / concept development / homework support]."',
    legalBasis: 'Sets out the service contract under UK Contract Law (offer + acceptance).',
    commonMistake: 'Being too vague: "I tutor various subjects" — this makes T&Cs unenforceable if a dispute arises about scope.',
  },
  {
    sectionName: '2. Fees & Payment Terms',
    importance: 'essential',
    description: 'State your hourly rate, session fee, how payment is collected (platform vs direct), and payment timing.',
    sampleLanguage: '"Sessions are charged at £[X] per [50/60]-minute session. For sessions booked through Tutorwise, payment is collected automatically by the platform at time of booking. For sessions arranged directly, payment is due within [24 hours / before the session]. I accept [bank transfer / PayPal / cash]."',
    legalBasis: 'Ensures you can recover payment under contract. Prevents disputes about fee level.',
    commonMistake: 'Not stating the payment method or timing — this leaves you unable to enforce payment if a client delays.',
  },
  {
    sectionName: '3. Cancellation & Rescheduling Policy',
    importance: 'essential',
    description: 'The most important clause. State the notice period required, what happens if the client cancels late, and your own cancellation rights.',
    sampleLanguage: '"Cancellations with 24+ hours notice: no charge. Cancellations with less than 24 hours notice: 50% of session fee is due. Same-day cancellations or no-shows: 100% of session fee is due. I reserve the right to cancel sessions with 24 hours notice for reasons including illness or emergency; no fee will be charged in this case. Exceptions to this policy may be made at my discretion for genuine emergencies."',
    legalBasis: 'UK Consumer Rights Act 2015 / contract law. Must be brought to client\'s attention BEFORE the contract is formed.',
    commonMistake: 'Setting the policy but never communicating it before the first session — a T&C not accepted before the contract is formed cannot be enforced retroactively.',
  },
  {
    sectionName: '4. Notice Period for Ending Tutoring',
    importance: 'essential',
    description: 'State how much notice either party must give to end the tutoring relationship.',
    sampleLanguage: '"Either party may end the tutoring arrangement by providing [2 weeks / 1 month] written notice via email or WhatsApp message. During the notice period, sessions will continue as scheduled unless otherwise agreed."',
    legalBasis: 'Service contract termination clause.',
    commonMistake: 'No notice period — tutors suddenly lose a student with no income replacement time.',
  },
  {
    sectionName: '5. Safeguarding & Child Protection',
    importance: 'essential',
    description: 'For tutors working with under-18s: state your DBS status, the safeguarding measures in place, and parental consent requirements.',
    sampleLanguage: '"I hold an Enhanced DBS certificate dated [Month Year] registered with the Update Service. For sessions with students under 18: (a) a parent or guardian must be present in the building for in-person sessions; (b) for online sessions, a parent or guardian must be accessible by phone or be in the same room. Sessions are not recorded without explicit written consent from a parent/guardian."',
    legalBasis: 'TTA Code of Professional Conduct. UK statutory safeguarding guidance. Not legally required for private tutors but professionally essential.',
    commonMistake: 'No mention of safeguarding in T&Cs — parents of primary-age children expect this and many will not book without it.',
  },
  {
    sectionName: '6. Confidentiality',
    importance: 'essential',
    description: 'State that student information is kept confidential and not shared with third parties.',
    sampleLanguage: '"All information about students, their academic performance, family circumstances, and personal details is kept strictly confidential. This information is used only for the purpose of providing tutoring services and will not be shared with third parties without explicit written consent, except where required by law (e.g. safeguarding obligations)."',
    legalBasis: 'UK GDPR / Data Protection Act 2018. Confidentiality implied in service contracts.',
    commonMistake: 'Sharing student progress or information with other parents without consent — this is a GDPR breach.',
  },
  {
    sectionName: '7. Data Protection / GDPR Notice',
    importance: 'essential',
    description: 'UK law requires a privacy notice if you process personal data. As a tutor, you are a data controller. Must state: what data you collect, why, how long you keep it, and how clients can request deletion.',
    sampleLanguage: '"Under UK GDPR, I am the data controller for the personal data I process in connection with tutoring services. I collect: student name, age/year group, academic level, subject(s), parent/guardian contact details, and session notes. This data is used solely to provide tutoring services and improve outcomes. Data is retained for the duration of tutoring and for up to [2 years] afterwards for administrative purposes, then securely deleted. You have the right to access, correct, or request deletion of your data by contacting me at [email]."',
    legalBasis: 'UK GDPR Articles 13-14 require a privacy notice at the point of data collection.',
    commonMistake: 'No privacy notice — even a sole trader private tutor is a data controller under UK GDPR and must provide one.',
  },
  {
    sectionName: '8. Limitation of Liability / No Guarantee of Results',
    importance: 'recommended',
    description: 'State that you provide professional educational support but cannot guarantee specific exam grades or academic results.',
    sampleLanguage: '"Tutoring sessions are provided on a best-efforts basis to support academic development. Exam results and academic outcomes depend on many factors including student effort, school teaching, and external circumstances. I do not guarantee specific grades or examination results. My liability for any claim arising from tutoring services is limited to the fees paid for the relevant sessions."',
    legalBasis: 'Consumer Rights Act 2015 requires reasonable care and skill but not specific outcomes.',
    commonMistake: 'No liability clause — opens tutors to unreasonable parental claims if a student fails despite tutoring.',
  },
  {
    sectionName: '9. Homework & Out-of-Session Expectations',
    importance: 'recommended',
    description: 'Clarify what (if anything) you provide between sessions — practice materials, email support, marking.',
    sampleLanguage: '"Sessions are self-contained. I may set practice exercises at the end of sessions. [Email / WhatsApp] support between sessions is available for [brief questions / marking practice papers] and is included within the session fee. Extensive out-of-session support beyond [X] minutes per week is charged at my standard hourly rate."',
    legalBasis: 'Clarifies the service scope — prevents "scope creep" where tutors are expected to provide unbounded free support.',
    commonMistake: 'No definition of out-of-session support — some parents expect unlimited email/WhatsApp Q&A between sessions for no extra charge.',
  },
  {
    sectionName: '10. Holiday and Sessional Pause Policy',
    importance: 'recommended',
    description: 'State how sessions are handled during school holidays — do they pause, continue by agreement, or require separate booking?',
    sampleLanguage: '"Regular scheduled sessions will pause during school half-term and holiday periods unless we specifically agree otherwise. Revision sessions during holiday periods can be arranged at the standard rate. I will confirm my availability at the start of each school term."',
    legalBasis: 'Manages expectations around holiday scheduling.',
    commonMistake: 'No holiday policy — tutors are surprised by no-shows during half-terms when students assume sessions are paused.',
  },
];

// ============================================================================
// COMPLIANCE OBLIGATIONS FOR TUTORS
// ============================================================================

export const COMPLIANCE_OBLIGATIONS: ComplianceObligation[] = [
  {
    obligation: 'HMRC Self Assessment registration',
    applies: 'UK tutors earning over £1,000/year from tutoring',
    authority: 'HMRC (gov.uk)',
    consequences: '£100 penalty for late registration, escalating to 100% of unpaid tax after 12 months',
    howToComply: 'Register at gov.uk/register-for-self-assessment. Deadline: 5 October following the tax year you first exceeded the threshold.',
    isCommon: true,
  },
  {
    obligation: 'DBS Enhanced Check (UK)',
    applies: 'UK tutors providing regulated activity with under-16s',
    authority: 'DBS / gov.uk',
    consequences: 'Not a criminal offence to tutor without DBS, but: most platforms require it, most parents of under-16s expect it, and some contracts (NTP, schools) mandate it',
    howToComply: 'Apply via an umbrella body for 2-5 day turnaround. Subscribe to Update Service (£13/year) for continuous employer checks.',
    isCommon: true,
  },
  {
    obligation: 'UK GDPR compliance (data protection)',
    applies: 'All UK tutors who collect and store personal data about students',
    authority: 'ICO (Information Commissioner\'s Office)',
    consequences: 'ICO fines up to £17.5m or 4% of global turnover for serious breaches. More commonly: complaints, damage to reputation',
    howToComply: 'Create a simple privacy notice. Keep a record of what data you hold. Do not keep data longer than necessary. Respond to subject access requests within 30 days.',
    isCommon: true,
  },
  {
    obligation: 'Professional Indemnity Insurance',
    applies: 'Strongly recommended for all tutors (not legally mandatory)',
    authority: 'TTA recommends; no legal enforcer',
    consequences: 'Without PI insurance: personal financial liability for any successful claim arising from professional advice or teaching',
    howToComply: 'Purchase from Hiscox, Markel, PolicyBee, or Simply Business. £1m cover from ~£50-100/year.',
    isCommon: false,
  },
  {
    obligation: 'VAT registration (if applicable)',
    applies: 'UK tutors with taxable turnover over £90,000/year (2024/25)',
    authority: 'HMRC',
    consequences: 'Failure to register when required: HMRC can back-bill for all VAT that should have been charged plus interest and penalties',
    howToComply: 'Monitor turnover monthly. Register within 30 days of exceeding the threshold. Note: individual private tutoring may qualify for VAT exemption — seek accountant advice.',
    isCommon: false,
  },
  {
    obligation: 'ICO registration (Data Protection fee)',
    applies: 'UK sole traders who are data controllers (most tutors who store student data)',
    authority: 'ICO (ico.org.uk)',
    consequences: '£400 civil monetary penalty for failure to pay the fee (if required)',
    howToComply: 'Check if you need to register: ico.org.uk/for-organisations/data-protection-fee. Most sole traders with only client contact details pay £40/year (Tier 1). Note: some exemptions apply — charitable, micro businesses, and personal data only for employment purposes.',
    isCommon: false,
  },
  {
    obligation: 'US Quarterly Estimated Tax Payments',
    applies: 'US self-employed tutors expecting to owe $1,000+ in federal tax',
    authority: 'IRS (irs.gov)',
    consequences: 'Underpayment penalty (typically 0.5-1% of underpaid amount per month)',
    howToComply: 'Pay via IRS Direct Pay (irs.gov/payments) by: April 15, June 15, September 15, January 15. Estimate using IRS Form 1040-ES.',
    isCommon: true,
  },
  {
    obligation: 'Australian WWCC (Working with Children Check)',
    applies: 'All Australian tutors working with students under 18',
    authority: 'State government (each state has own authority)',
    consequences: 'Criminal offence to engage in child-related work without a current WWCC. Fines and potential prosecution.',
    howToComply: 'Apply through your state\'s authority before starting to tutor. Check reciprocal recognition between states if tutoring across state lines.',
    isCommon: true,
  },
];

// ============================================================================
// KEY QUESTIONS TUTORS ASK — AND ANSWERS
// ============================================================================

export const COMMON_TUTOR_QUESTIONS = [
  {
    question: 'Do I need to register as a business to tutor?',
    shortAnswer: 'Yes, if you earn more than £1,000/year from tutoring in the UK — register for Self Assessment with HMRC.',
    fullAnswer: 'You do not need to register a business (i.e. you do not need to go to Companies House). You just need to register with HMRC for Self Assessment to declare your self-employment income. This is free and takes 10 minutes at gov.uk/register-for-self-assessment. The £1,000 Trading Allowance means the first £1,000 of tutoring income is completely tax-free with no need to register.',
  },
  {
    question: 'Can I tutor while still employed as a teacher?',
    shortAnswer: 'Yes, but check your employment contract for any moonlighting or conflict of interest clauses.',
    fullAnswer: 'Most teacher contracts permit tutoring as a separate self-employment activity, but some have restrictions — particularly around tutoring your own students or charging fees that undercut the school\'s own provision. Read your contract or ask HR. The income must be declared to HMRC separately from your employment income. You will pay Income Tax at 20-40% on tutoring profits above your remaining Personal Allowance after your teaching salary uses it up.',
  },
  {
    question: 'What expenses can I deduct from my tutoring income?',
    shortAnswer: 'Any cost "wholly and exclusively" for your tutoring business: laptop, software, books, home office, travel, insurance, professional subscriptions.',
    fullAnswer: 'Key deductible expenses: (1) Equipment: laptop, webcam, printer, digital whiteboard — deduct % used for tutoring; (2) Software: Zoom, FreeAgent, scheduling tools, online whiteboard subscriptions; (3) Home office: flat-rate £6/week (simplified) or proportional heating/broadband costs based on workspace proportion; (4) Travel: 45p/mile HMRC approved rate (first 10,000 miles), or actual public transport costs; (5) Books and teaching resources; (6) TTA membership and CPD courses; (7) Professional indemnity and public liability insurance; (8) DBS check cost; (9) Website hosting and marketing; (10) Accountant and bookkeeping fees. You cannot deduct: personal expenses, travel from home to a fixed place of work, clothing (unless a distinctive uniform), food and drink (unless travelling overnight for business).',
  },
  {
    question: 'Should I use Tutorwise for payments or invoice clients directly?',
    shortAnswer: 'Tutorwise platform payments are strongly recommended — they handle payment processing, provide automatic receipts, and protect both parties.',
    fullAnswer: 'For bookings made through Tutorwise: always use the platform payment system. The 10% platform fee is offset by: no chasing late invoices, automatic payment confirmation, and dispute resolution if issues arise. For direct bookings (off-platform regular clients): bank transfer is simplest, with a clear invoice. Keep records of all income for HMRC. Do not accept cash without recording it — all income must be declared regardless of payment method.',
  },
  {
    question: 'Do I need to charge VAT to my students?',
    shortAnswer: 'Almost certainly not — your annual tutoring income would need to exceed £90,000 before VAT registration is mandatory.',
    fullAnswer: 'The VAT threshold in 2024/25 is £90,000 of taxable turnover. Very few individual private tutors reach this. If you do exceed it, there is a strong argument that individual private tutoring qualifies for VAT exemption under VATA 1994 Schedule 9 Group 6 (education) — but this is technically complex and you should get an accountant\'s advice. Do not simply assume exemption without checking.',
  },
  {
    question: 'What notice should I give my school if I want to leave to tutor full-time?',
    shortAnswer: 'Check your contract. Most teachers: one term\'s notice under STPCD. Minimum statutory notice after 1+ year employment: 1 week per year of service.',
    fullAnswer: 'Under the School Teachers\' Pay and Conditions Document (STPCD), teachers in England must give notice to leave by: half-term (to leave at end of term). This means: give notice at October half-term to leave at Christmas; give notice at February half-term to leave at Easter; give notice before the end of May to leave at end of summer term. The cleanest exit: announce at May half-term, leave at end of summer term — you then start full-time tutoring September, the biggest intake month. Check your individual contract — some schools require longer notice. Never leave mid-term if you can avoid it — it burns bridges with colleagues who may later refer students to you.',
  },
];

// ============================================================================
// DSPy-STYLE BUSINESS SETUP SIGNATURE
// ============================================================================

export const BUSINESS_SETUP_ADVISOR_SIGNATURE = {
  name: 'BusinessSetupAndComplianceAdvisor',
  description: 'Answer tutor questions about business registration, tax, T&Cs, insurance, and career decisions with UK-primary, internationally-contextualised, specific and accurate advice',
  inputs: ['question', 'user_context', 'country', 'income_level', 'employment_status'],
  outputs: ['direct_answer', 'key_considerations', 'action_steps', 'important_caveats', 'resources'],
  chainOfThought: true,
  disclaimer: 'The Growth Agent provides general educational information about business and tax matters. This is not legal or financial advice. Users should consult a qualified accountant or solicitor for advice specific to their circumstances.',
  examples: [
    {
      inputs: {
        question: 'Should I set up as a sole trader or limited company for my tutoring?',
        user_context: { monthly_income: 1800, experience_years: 2, employees: 0, country: 'UK' },
        country: 'UK',
        income_level: 21600,
        employment_status: 'part-time teacher + tutoring',
      },
      outputs: {
        direct_answer: 'Sole trader — without question. At £21,600/year, a limited company would cost you money, not save it.',
        key_considerations: [
          'Your tax saving from a limited company at £21,600 would be approximately £800-1,200/year',
          'Accountancy fees for a limited company: £600-1,200/year minimum',
          'Net benefit: -£0 to +£600. The admin burden is far greater than the saving.',
          'Sole trader setup: free, takes 10 minutes, same allowable expenses, same professional credibility',
          'The limited company conversation is worth having when your gross profit consistently exceeds £55,000',
        ],
        action_steps: [
          'Register for Self Assessment at gov.uk/register-for-self-assessment (free, 10 min)',
          'Open a free business bank account (Starling or Monzo Business — free)',
          'Start tracking income and expenses in a simple spreadsheet or FreeAgent',
          'Set aside 25-30% of gross tutoring income each month for tax',
        ],
        important_caveats: [
          'If you are a part-time teacher, your teaching salary already uses most of your Personal Allowance. Tutoring income may be taxed at 20% from the first £1.',
          'Payments on Account: in your second year of Self Assessment, you will pay 1.5x your first year\'s tax bill on 31 January. Budget for this surprise.',
          'This is general information — a qualified accountant can model your specific situation more accurately.',
        ],
        resources: [
          'gov.uk/set-up-sole-trader',
          'HMRC free tax calculator: gov.uk/estimate-self-assessment-tax-bill',
          'MoneySavingExpert self-employment guide',
        ],
      },
      reasoning: 'The sole trader vs limited company decision is straightforward at this income level. The mathematical answer is clear: sole trader saves the tutor money vs limited company at £21,600 annual income. The Growth Agent should give a direct answer, not hedge. Include the "payments on account" warning — this catches many new self-employed tutors completely by surprise in their second year.',
    },
  ],
};
