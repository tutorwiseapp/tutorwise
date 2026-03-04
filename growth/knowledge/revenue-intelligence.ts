/**
 * Growth Agent — Core Skill: Revenue Intelligence
 *
 * The definitive knowledge base for tutoring income analysis, forecasting,
 * and the career-level decisions tutors face: going full-time, business
 * structure (sole trader vs limited company), tax obligations, T&Cs, and
 * income stream attribution.
 *
 * This file aims to make the Growth Agent the most knowledgeable advisor
 * in the UK tutoring industry — answering questions other platforms cannot.
 *
 * Sources:
 *   - HMRC Self Assessment guidance (gov.uk/self-assessment-tax-returns)
 *   - HMRC Allowable Expenses for Self-Employed (gov.uk/expenses-if-youre-self-employed)
 *   - Companies House registration guidance
 *   - UK Employment Rights Act 1996 (notice periods for employed tutors)
 *   - Teachers' Pay and Conditions (STPCD) — reference for teaching salary benchmarks
 *   - TTA (The Tutors' Association) — business guidance for tutors
 *   - MyTutor / TutorHunt / Superprof market data 2024-2025
 *   - Sutton Trust Private Tutoring Impact Reports
 *   - HMRC Making Tax Digital (MTD) programme
 *   - National Insurance rates 2024-2025 (HMRC)
 *   - UK Trading Allowance rules
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IncomePattern {
  scenario: string;
  monthlyBookings: number;
  avgHourlyRate: number;
  weeklyHours: number;
  grossMonthlyIncome: number;
  annualGrossIncome: number;
  tier: 'starter' | 'part-time' | 'growing' | 'full-time' | 'premium';
  description: string;
}

export interface SeasonalPattern {
  month: string;
  demandIndex: number; // 100 = average month
  incomeFactor: number; // multiplier vs average month
  keyDrivers: string[];
  tutorActions: string[];
}

export interface FullTimeJumpCriteria {
  criterion: string;
  minimumThreshold: string;
  idealThreshold: string;
  rationale: string;
  riskIfBelowMinimum: string;
}

export interface TaxObligationUK {
  obligation: string;
  threshold: string;
  rate: string;
  deadline: string;
  guidance: string;
  hmrcLink: string;
}

export interface BusinessStructure {
  type: string;
  setup: string;
  costToSetup: string;
  annualAdmin: string;
  taxAdvantage: string;
  taxDisadvantage: string;
  idealFor: string;
  notIdealFor: string;
  keyConsiderations: string[];
}

// ============================================================================
// UK TUTOR INCOME PATTERNS
// ============================================================================

export const INCOME_PATTERNS: IncomePattern[] = [
  {
    scenario: 'Beginner / Side Income',
    monthlyBookings: 8,
    avgHourlyRate: 30,
    weeklyHours: 4,
    grossMonthlyIncome: 240,
    annualGrossIncome: 2880,
    tier: 'starter',
    description: 'Below the £1,000/year Trading Allowance threshold — no tax to pay. Common for undergraduates or employed people supplementing income. No need to register as self-employed at this level.',
  },
  {
    scenario: 'Part-Time (alongside employment)',
    monthlyBookings: 20,
    avgHourlyRate: 35,
    weeklyHours: 10,
    grossMonthlyIncome: 700,
    annualGrossIncome: 8400,
    tier: 'part-time',
    description: 'Above the £1,000 Trading Allowance — must register for Self Assessment with HMRC. After allowable expenses, effective taxable income ~£6,000-7,000. Most employed tutors at this level pay Class 2 NI + some income tax.',
  },
  {
    scenario: 'Serious Part-Time / Transition Phase',
    monthlyBookings: 35,
    avgHourlyRate: 40,
    weeklyHours: 16,
    grossMonthlyIncome: 1400,
    annualGrossIncome: 16800,
    tier: 'growing',
    description: 'The "transition zone" — many tutors here are deciding whether to go full-time. Income is meaningful but not yet sufficient to replace a teaching salary. Key decision point: build to £30k+ before leaving employment.',
  },
  {
    scenario: 'Full-Time Tutor (modest)',
    monthlyBookings: 60,
    avgHourlyRate: 40,
    weeklyHours: 28,
    grossMonthlyIncome: 2400,
    annualGrossIncome: 28800,
    tier: 'full-time',
    description: 'Equivalent to a starting teaching salary. After tax (~£4,000 NI + £2,500 income tax, assuming good expenses deductions): ~£22,000 take-home. Viable in lower-cost areas. Challenging in London without London-rate pricing.',
  },
  {
    scenario: 'Full-Time Tutor (established)',
    monthlyBookings: 80,
    avgHourlyRate: 50,
    weeklyHours: 32,
    grossMonthlyIncome: 4000,
    annualGrossIncome: 48000,
    tier: 'full-time',
    description: 'Comfortably full-time. After tax (~£8,500 NI + income tax at higher rate above £50,270): ~£34,000-36,000 take-home. Equivalent to experienced classroom teacher pay. Most sustainable full-time tutoring income model.',
  },
  {
    scenario: 'Premium / Niche Specialist',
    monthlyBookings: 50,
    avgHourlyRate: 85,
    weeklyHours: 22,
    grossMonthlyIncome: 4250,
    annualGrossIncome: 51000,
    tier: 'premium',
    description: 'Fewer hours, higher rates. Common for: Oxbridge prep, UCAT/BMAT, 11+ specialists in London, A-Level Chemistry/Further Maths. Sustainable, reduced burnout risk. Often the target state after 3-5 years of building reputation.',
  },
  {
    scenario: 'Premium London Specialist',
    monthlyBookings: 45,
    avgHourlyRate: 110,
    weeklyHours: 20,
    grossMonthlyIncome: 4950,
    annualGrossIncome: 59400,
    tier: 'premium',
    description: 'Top tier. Typically requires: Oxbridge or Russell Group degree, 5+ years experience, 50+ platform reviews, niche specialisation (medical school, Eton/Harrow entrance, Oxbridge interviews). Not achievable in first 2-3 years.',
  },
];

// ============================================================================
// UK SEASONAL INCOME PATTERNS
// ============================================================================

export const UK_SEASONAL_PATTERNS: SeasonalPattern[] = [
  { month: 'January', demandIndex: 135, incomeFactor: 1.35, keyDrivers: ['Mock exam panic', 'New Year resolution for academic improvement', 'Post-Christmas parental concern about grades'], tutorActions: ['Fill any remaining spaces urgently', 'Raise rates for new January starters — high urgency market', 'Send win-back messages to September students who paused'] },
  { month: 'February', demandIndex: 120, incomeFactor: 1.20, keyDrivers: ['Post-mock results', 'Half-term revision boost', 'Year 11/13 realising exam proximity'], tutorActions: ['Offer half-term intensive (2-3 hours/day)', 'Students who got bad mocks are now motivated — high conversion on outreach'] },
  { month: 'March', demandIndex: 125, incomeFactor: 1.25, keyDrivers: ['6-8 weeks to GCSEs/A-Levels', 'Pre-Easter revision preparation'], tutorActions: ['Book students for Easter revision sessions', 'Announce any Easter availability'] },
  { month: 'April', demandIndex: 145, incomeFactor: 1.45, keyDrivers: ['Easter revision (highest per-week demand)', 'Final push before May exams', 'Many tutors fully booked'], tutorActions: ['Easter intensive sessions', 'If full: add to waitlist via referral link — earn commission passively', 'Book September clients NOW before summer gaps'] },
  { month: 'May', demandIndex: 150, incomeFactor: 1.50, keyDrivers: ['GCSE exams begin (usually first 2 weeks)', 'A-Level exams (mid-May to end of June)', 'Highest density of sessions per student'], tutorActions: ['Exam-day prep sessions', 'Post-paper debrief sessions — high parental anxiety drives last-minute bookings', 'Begin September planning conversations'] },
  { month: 'June', demandIndex: 130, incomeFactor: 1.30, keyDrivers: ['A-Level exams continue', 'Final GCSE papers', 'End of exam season (varies by student)'], tutorActions: ['Wrap-up sessions', 'Results day planning (mid-August)', 'Ask for reviews as exams complete'] },
  { month: 'July', demandIndex: 55, incomeFactor: 0.55, keyDrivers: ['School holidays begin', 'Families on holiday', 'Most GCSE/A-Level students done until September'], tutorActions: ['Focus on counter-cyclical niches: 11+ prep (Year 5 starts NOW), IELTS/EFL, professional exams', 'University admissions coaching (UCAS personal statements for September entry)', 'Build referral network — admin time while income is low', 'Plan September marketing in July'] },
  { month: 'August', demandIndex: 65, incomeFactor: 0.65, keyDrivers: ['A-Level results day (mid-August) — clearing + resit tutoring', 'GCSE results day (late August)', 'September intake marketing begins'], tutorActions: ['GCSE results day: contact past students for reviews (they\'re in milestone mood)', 'Clearing tutoring: quick-conversion niche for students who missed grades', 'Send September re-engagement messages to all past students', 'Confirm September bookings and update availability'] },
  { month: 'September', demandIndex: 160, incomeFactor: 1.60, keyDrivers: ['Biggest intake month of the year', 'New GCSE/A-Level students starting', 'New academic year resolution for parents', 'Schools\' first parents\' evening (triggers tutoring decisions)'], tutorActions: ['Fill all available slots — September clients often continue year-round', 'Raise rates for September starters — demand is at its highest', 'Ask September starters for referrals immediately (fresh-start mindset is receptive)', 'Nextdoor + Facebook posts: "I\'m a local tutor with spaces from September"'] },
  { month: 'October', demandIndex: 115, incomeFactor: 1.15, keyDrivers: ['First half-term (October, 1 week)', 'Parents\' evenings at most schools', 'GCSE/A-Level coursework deadlines begin'], tutorActions: ['Half-term revision mini-intensive', 'Post-parents\'-evening surge: parents book tutors after being told child is struggling', 'Secure November mock prep bookings now'] },
  { month: 'November', demandIndex: 125, incomeFactor: 1.25, keyDrivers: ['Pre-Christmas mock exams at many schools', 'University personal statement deadline (UCAS — medicine/Oxbridge: Oct 15)'], tutorActions: ['Mock prep urgency messaging', 'Oxbridge/medicine applicants: personal statement and admissions test prep at peak'] },
  { month: 'December', demandIndex: 80, incomeFactor: 0.80, keyDrivers: ['End of term', 'Christmas break (2 weeks, no sessions)', 'Mock exam results landing (triggers January demand)'], tutorActions: ['End-of-term summaries for parents', 'Plant seeds for January: "Happy to do a session in the week before Christmas to get ahead"', 'Christmas message to maintain relationship with all students'] },
];

// ============================================================================
// THE FULL-TIME JUMP DECISION FRAMEWORK
// ============================================================================

export const FULL_TIME_JUMP_CRITERIA: FullTimeJumpCriteria[] = [
  {
    criterion: 'Monthly tutoring income',
    minimumThreshold: '£2,000/month for 3 consecutive months',
    idealThreshold: '£2,500-3,000/month for 6 consecutive months',
    rationale: 'After tax and NI (self-employed), £2,000/month gross ≈ £1,600 net — below living wage in most UK cities. £2,500+ gross gives £2,000+ net — viable outside London.',
    riskIfBelowMinimum: 'Summer income collapse (July-August) can drop income to 50-60% of term-time level. Without a 6-month buffer, tutors risk financial stress and are forced to take on unsuitable students or lower their rates.',
  },
  {
    criterion: 'Client base stability',
    minimumThreshold: '12+ regular students (weekly recurring sessions)',
    idealThreshold: '18-20+ regular students with at least 6 long-term (6+ months)',
    rationale: 'Each student represents roughly 1-2 hours/week. 12 students × 1.5 hrs/week = 18 hrs billable. Long-term students provide income predictability — new students take 4-8 weeks to find.',
    riskIfBelowMinimum: 'Student churn at end of GCSE/A-Level years can remove 30-50% of income overnight. Without pipeline, income becomes feast-or-famine.',
  },
  {
    criterion: '6-month cash reserve',
    minimumThreshold: '3 months\' living expenses saved',
    idealThreshold: '6 months\' living expenses saved',
    rationale: 'The summer gap (July-August) alone can reduce income by £2,000-3,000 vs term-time. A cash reserve prevents panic-selling (discounting rates, taking every student regardless of fit).',
    riskIfBelowMinimum: 'Financial pressure in summer leads to under-pricing and burnout. Many tutors return to employment after one bad summer.',
  },
  {
    criterion: 'Waiting list / demand pipeline',
    minimumThreshold: 'At least 3 enquiries per week OR a 4+ person waiting list',
    idealThreshold: '6+ enquiries per week, 8+ waiting list, with September already partially booked',
    rationale: 'Regular inbound demand means the business is pulling students to you, not you chasing them. This is the clearest signal that full-time is viable.',
    riskIfBelowMinimum: 'Without inbound demand, scaling from 12 to 20 students post-jump requires aggressive outreach at the exact time you are also adjusting to full-time self-employment.',
  },
  {
    criterion: 'Platform diversification',
    minimumThreshold: 'At least 30% of students are direct (not from a single platform)',
    idealThreshold: '50%+ direct clients, platform as supplemental channel only',
    rationale: 'Platform dependency is an existential risk. If a platform changes its algorithm, raises commission, or folds, a platform-dependent tutor loses income overnight. Direct clients are more loyal and more profitable (no commission).',
    riskIfBelowMinimum: 'Platform-only tutors going full-time are exposed to a single point of failure they do not control.',
  },
  {
    criterion: 'Business admin readiness',
    minimumThreshold: 'Registered as self-employed with HMRC, using basic invoicing or bookkeeping',
    idealThreshold: 'Sole trader registration, business bank account, invoicing system (FreeAgent, QuickBooks, or spreadsheet), understanding of allowable expenses',
    rationale: 'HMRC requires registration within 3 months of earning above the £1,000 Trading Allowance. Full-time tutors earning £20k+ face meaningful tax bills — poor record-keeping leads to overpayment.',
    riskIfBelowMinimum: 'Tax surprise at self-assessment deadline can create financial crisis. HMRC penalties for late registration.',
  },
  {
    criterion: 'Timing relative to employment contract',
    minimumThreshold: 'Give at least 4 weeks notice (statutory minimum for most teaching roles)',
    idealThreshold: 'Give full contractual notice (typically one term for teachers: half-term to end-of-term). Leave at end of summer term (cleanest transition).',
    rationale: 'UK teacher contracts under STPCD (School Teachers\' Pay and Conditions Document) typically require one term\'s notice. Leaving mid-term burns bridges with colleagues and headteachers who may later refer students to you.',
    riskIfBelowMinimum: 'Breach of employment contract. Loss of references. Potential legal action for short notice in some cases.',
  },
];

export const FULL_TIME_JUMP_CALCULATOR = {
  description: 'How to decide when you are ready to go full-time tutoring',
  teacherSalaryBenchmarks: {
    m1_england: 31650,  // M1 Main Pay Scale England 2024/25
    m6_england: 43685,  // M6 (experienced teacher)
    upp3_england: 49084, // Upper Pay Scale UPS3
    london_fringe: { uplift_m1: 2679, uplift_m6: 2679 },
    london_inner: { uplift_m1: 7543, uplift_m6: 7543 },
    notes: 'Source: STPCD 2024/25. Teachers in England. Scotland / Wales / NI differ.',
  },
  decisionMatrix: [
    {
      profileType: 'NQT / Early Career Teacher (ECT)',
      currentSalary: '£31,650',
      tutoring_income_needed_to_replace: '£40,000+ gross (accounting for loss of pension, sick pay, holidays)',
      advice: 'Too early to jump. Build your client base to 15+ regular students FIRST. NQT/ECT years provide invaluable classroom experience that makes you a better (and higher-rate) tutor. Most successful full-time tutors were teachers for 3-7 years first.',
      timeline: 'Consider full-time transition after 5+ years teaching experience',
    },
    {
      profileType: 'Experienced Teacher (M4-M6)',
      currentSalary: '£38,000-£43,685',
      tutoring_income_needed_to_replace: '£48,000-52,000 gross (pension + benefits + security replacement)',
      advice: 'Viable IF you have 15+ regular students AND £2,500+/month for 6 months AND a waiting list. The "transition year" is critical — many teachers go part-time (0.5 or 0.8 contract) first to test demand.',
      timeline: 'Transition via part-time teaching contract before full jump',
    },
    {
      profileType: 'Department Head / Senior Teacher (UPS/TLR)',
      currentSalary: '£46,000-£65,000+',
      tutoring_income_needed_to_replace: '£55,000-75,000 gross',
      advice: 'The hardest jump financially but often the most successful tutors. Niche-specialised senior teachers (Head of Maths, HOD Chemistry) with 5-10 years of student relationships can build full-time premium practice quickly. Requires a strong client pipeline before leaving.',
      timeline: '18-24 months of serious part-time tutoring before full transition',
    },
  ],
  transitionalStrategies: [
    {
      strategy: '0.8 Teaching Contract',
      description: 'Reduce to 4 days/week teaching. Use Friday + one weekend day for tutoring. Builds income while maintaining employment security.',
      pros: 'Low risk. Maintains pension contributions. Gives dedicated tutoring time.',
      cons: 'Requires school to agree. Part-time salary reduction.',
      recommendedFor: 'Teachers with 8-15 regular students wanting to test demand before full jump',
    },
    {
      strategy: 'Supply Teaching + Tutoring',
      description: 'Leave permanent position. Register with supply agencies. Tutor the remaining days.',
      pros: 'Flexible schedule. Can choose supply days around tutoring calendar. No contractual constraints.',
      cons: 'Supply day rates vary (£130-200/day). No benefits. Requires managing two income streams.',
      recommendedFor: 'Teachers who already have 15+ tutoring students and want maximum flexibility',
    },
    {
      strategy: 'Easter/Summer Leave',
      description: 'Leave at end of summer term. Clean transition with maximum runway (September intake).',
      pros: 'Starts with September — highest-demand month. Clean exit from school. Time to prepare over summer.',
      cons: 'Loses teacher income for 6+ weeks before September earnings stabilise.',
      recommendedFor: 'Most tutors. Cleanest and most recommended transition path.',
    },
  ],
};

// ============================================================================
// UK BUSINESS STRUCTURE — SOLE TRADER vs LIMITED COMPANY
// ============================================================================

export const UK_BUSINESS_STRUCTURES: BusinessStructure[] = [
  {
    type: 'Sole Trader (Self-Employed)',
    setup: 'Register with HMRC for Self Assessment online (gov.uk/set-up-sole-trader). Takes 10 minutes. No Companies House registration needed.',
    costToSetup: 'Free. No registration fee.',
    annualAdmin: 'Annual Self Assessment tax return (due 31 January each year online). Simple bookkeeping of income and expenses. Making Tax Digital (MTD) for Income Tax coming 2026 for sole traders earning £50k+.',
    taxAdvantage: 'Simplest. Lower admin costs. Business losses can offset personal income tax. Trading Allowance: first £1,000 of income completely tax-free.',
    taxDisadvantage: 'Income Tax on ALL profits above Personal Allowance (£12,570). No option to pay yourself dividends at lower tax rate. All income taxed at 20-40%+ income tax rates.',
    idealFor: 'Tutors earning under £50,000/year. Tutors with straightforward income (no employees, no complex structure). Anyone just starting out.',
    notIdealFor: 'Tutors consistently earning £60,000+ where limited company tax savings become significant. Tutors with employees or complex business arrangements.',
    keyConsiderations: [
      'Register with HMRC within 3 months of earning above £1,000 from tutoring (gov.uk/register-for-self-assessment)',
      'Keep records of all income and expenses (a simple spreadsheet is sufficient)',
      'Two tax payments per year: 31 January (balancing payment + first payment on account) and 31 July (second payment on account)',
      'National Insurance: Class 2 (£3.45/week, 2024/25) and Class 4 (9% on profits £12,570-£50,270; 2% above)',
      'VAT registration required if turnover exceeds £90,000/year (2024/25 threshold)',
      'Separate bank account strongly recommended (not legally required but essential for clean bookkeeping)',
    ],
  },
  {
    type: 'Private Limited Company (Ltd)',
    setup: 'Register with Companies House (gov.uk/register-a-company). Takes 1-3 days. Requires: company name, registered office address, director(s), shareholder(s), memorandum and articles of association.',
    costToSetup: '£12 online (Companies House fee). Formation agents charge £50-150 for additional support.',
    annualAdmin: 'Annual accounts filed with Companies House (£150-500/year for accountant). Corporation Tax return (CT600). Payroll if paying yourself salary. Director\'s Self Assessment. Annual Confirmation Statement (£34). More complex — most tutors need an accountant (£500-1,200/year).',
    taxAdvantage: 'Corporation Tax rate: 19% (profits under £50k), 25% (profits above £250k). Pay yourself a mix of salary (to NI threshold) + dividends (taxed at 8.75%/33.75% vs 20%/40% income tax). Tax saving at £60k+ income can be £3,000-8,000/year.',
    taxDisadvantage: 'Company money is NOT your money — must pay yourself through salary/dividends. Double layer of admin. Accountant fees offset some tax savings. Director loans are taxed if not managed correctly.',
    idealFor: 'Tutors earning consistently above £50,000-60,000/year. Tutors running a tutoring business with employees. Tutors who want to retain earnings in the company for investment.',
    notIdealFor: 'Most tutors earning under £50,000/year — the tax saving rarely exceeds the additional accountant cost. Tutors who want simplicity.',
    keyConsiderations: [
      'The tax saving crossover point is typically £50,000-60,000 gross profit — below this, sole trader is simpler and effectively as tax-efficient',
      'You cannot simply spend company money — you must pay yourself a salary and/or declare dividends',
      'Optimal salary structure 2024/25: pay yourself £12,570/year salary (full personal allowance, low NI) + dividends from remaining profit',
      'Dividend allowance: first £500 of dividends tax-free (2024/25). Reduced from £2,000 in 2023.',
      'If you incorporate, you may lose some mortgage lender options (self-employed income counted differently)',
      'Most tutors should incorporate only when consistently earning £55,000+ and with an accountant advising on specific circumstances',
    ],
  },
  {
    type: 'Partnership',
    setup: 'Register each partner as self-employed. File a Partnership Return (SA800) each year plus individual returns.',
    costToSetup: 'Free (unincorporated partnership). No formal registration needed.',
    annualAdmin: 'Partnership tax return + individual self-assessment for each partner.',
    taxAdvantage: 'Split income between partners to use both personal allowances — useful if one partner earns less in other employment.',
    taxDisadvantage: 'Joint liability — partners are personally liable for each other\'s debts.',
    idealFor: 'Two tutors running a joint tutoring business (e.g. husband/wife, tutor plus admin partner).',
    notIdealFor: 'Solo tutors. Situations where equal liability is not appropriate.',
    keyConsiderations: [
      'A written Partnership Agreement is strongly recommended even if not legally required',
      'Limited Liability Partnership (LLP) offers limited liability protection — more complex setup',
      'Less common for individual tutors; more relevant for tutoring agencies',
    ],
  },
];

// ============================================================================
// UK TAX OBLIGATIONS FOR TUTORS
// ============================================================================

export const UK_TAX_OBLIGATIONS: TaxObligationUK[] = [
  {
    obligation: 'Self Assessment Registration',
    threshold: 'Earn more than £1,000 from self-employment in a tax year (Trading Allowance)',
    rate: 'Free to register',
    deadline: 'Register by 5 October following the tax year in which you first earned above the threshold',
    guidance: 'Register at gov.uk/register-for-self-assessment. Failure to register on time: £100 penalty, escalating to 100% of tax owed after 12 months.',
    hmrcLink: 'gov.uk/register-for-self-assessment',
  },
  {
    obligation: 'Income Tax on Tutoring Profits',
    threshold: 'Profits above the Personal Allowance (£12,570 for most people, 2024/25)',
    rate: '20% basic rate (£12,571-£50,270 profits); 40% higher rate (£50,271-£125,140); 45% additional rate (above £125,140)',
    deadline: 'Self Assessment return due 31 January following tax year end. Tax year: 6 April to 5 April.',
    guidance: 'Tutoring income + any other income (employment, rental, etc.) all count toward your income tax band. If you are also employed (e.g. part-time teacher), your employment income and tutoring profits are combined.',
    hmrcLink: 'gov.uk/income-tax-rates',
  },
  {
    obligation: 'National Insurance (Class 2 + Class 4) — Self-Employed',
    threshold: 'Class 2: if profits above £12,570 (2024/25 — note: Class 2 effectively abolished but Class 4 remains)',
    rate: 'Class 4: 6% on profits £12,570-£50,270; 2% on profits above £50,270 (2024/25 rates)',
    deadline: 'Paid through Self Assessment (January and July payments)',
    guidance: 'Class 2 NI was effectively abolished from April 2024. Class 4 remains. State Pension credit: you still get State Pension credits as a self-employed person paying Class 4 NI.',
    hmrcLink: 'gov.uk/national-insurance-self-employed',
  },
  {
    obligation: 'VAT Registration',
    threshold: 'Mandatory if taxable turnover exceeds £90,000 in any 12-month period (threshold as of 2024/25)',
    rate: '20% standard rate on tutoring services (note: some education services are VAT exempt — individual private tutoring by a sole trader to individuals is likely exempt from VAT if the tutor is a sole trader providing "eligible body" exemption; seek accountant advice)',
    deadline: 'Must register within 30 days of exceeding threshold',
    guidance: 'Important: one-to-one private tutoring by a sole trader MAY qualify for VAT exemption under VATA 1994 Schedule 9 Group 6. This is a complex area — HMRC guidance and accountant advice essential. Tutoring companies are likely NOT exempt.',
    hmrcLink: 'gov.uk/guidance/education-vat-notice-701-30',
  },
  {
    obligation: 'Allowable Expenses (reduce your taxable profit)',
    threshold: 'Any expense "wholly and exclusively" for tutoring business purposes',
    rate: 'Deducted from income before tax — saves 20-40% of the expense in tax',
    deadline: 'Claimed on annual Self Assessment return',
    guidance: 'Key allowable expenses for tutors: (1) Home office (use of home — percentage of mortgage interest/rent, heating, broadband proportional to workspace); (2) Equipment (laptop, webcam, whiteboard, printer, desk); (3) Software (Zoom Pro, online whiteboard tools, scheduling software, tutoring platform subscriptions — but NOT personal use portion); (4) Professional subscriptions (TTA membership, professional journals); (5) Professional development (CPD courses, educational resources); (6) Books, stationery, printed materials used for tutoring; (7) Travel to students\' homes (mileage at HMRC approved rate 45p/mile first 10,000 miles); (8) Phone costs (business use portion only); (9) Advertising and marketing (website hosting, Google Ads, platform fees); (10) Insurance (professional indemnity, public liability); (11) Accountant fees.',
    hmrcLink: 'gov.uk/expenses-if-youre-self-employed',
  },
  {
    obligation: 'Payments on Account (estimated tax payments)',
    threshold: 'If your Self Assessment tax bill is over £1,000',
    rate: 'Two payments: each equal to 50% of the previous year\'s tax bill',
    deadline: '31 January (first payment) and 31 July (second payment)',
    guidance: 'Common shock for new self-employed tutors: in your second year, HMRC requires you to pay the CURRENT year\'s estimated tax in addition to the PREVIOUS year\'s balancing payment. Example: if you owe £3,000 in tax for Year 1, you pay £3,000 + £1,500 (first payment on account for Year 2) = £4,500 on 31 January Year 2. Plan for this — set aside 25-30% of income monthly.',
    hmrcLink: 'gov.uk/understand-self-assessment-bill/payments-on-account',
  },
  {
    obligation: 'Making Tax Digital (MTD) for Income Tax',
    threshold: 'Sole traders with income over £50,000 from April 2026; £30,000 from April 2027',
    rate: 'No extra tax — just mandatory digital record-keeping and quarterly reporting',
    deadline: 'MTD ITSA from April 2026 for relevant tutors',
    guidance: 'MTD requires using HMRC-compatible software (FreeAgent, QuickBooks, Xero, HMRC\'s free tools) to keep records and submit quarterly updates. Annual return still required. Most tutors affected will need to switch from spreadsheets to a cloud accounting package.',
    hmrcLink: 'gov.uk/government/publications/making-tax-digital-for-income-tax-overview',
  },
];

// ============================================================================
// TUTOR TERMS & CONDITIONS GUIDE
// ============================================================================

export const TUTOR_TERMS_AND_CONDITIONS = {
  overview: 'A clear, written Terms & Conditions document protects both the tutor and client. The TTA strongly recommends all tutors have written T&Cs. They can be sent as a PDF, embedded on a website, or shared as a Google Doc before the first session.',
  keyComponents: [
    {
      section: 'Cancellation Policy',
      importance: 'Critical',
      recommended: '24-48 hours notice required for cancellations. Under 24 hours: 50-100% of session fee charged. No-shows: 100% of session fee charged.',
      rationale: 'Last-minute cancellations are the #1 income leakage for tutors. Clear policy set in advance prevents awkward post-cancellation disputes.',
      sampleClause: '"Cancellations with less than 24 hours notice will be charged at 50% of the session fee. Cancellations with less than 2 hours notice or no-shows will be charged at the full session fee. Exceptions may be made at the tutor\'s discretion for genuine emergencies."',
    },
    {
      section: 'Payment Terms',
      importance: 'Critical',
      recommended: 'Payment in advance (via Tutorwise platform) or within 24 hours of session. Monthly invoicing for regular clients.',
      rationale: 'Late payment is a common problem. Advance payment (standard on platforms like Tutorwise) eliminates this entirely. For direct clients, clear terms prevent invoice disputes.',
      sampleClause: '"Sessions booked through Tutorwise are paid in advance via the platform. For direct bookings, payment is due within 24 hours of the session. Late payment may result in suspension of future sessions."',
    },
    {
      section: 'Notice Period (ending tutoring relationship)',
      importance: 'Medium',
      recommended: '2 weeks written notice from either party to end the tutoring relationship.',
      rationale: 'Allows both parties to plan. Prevents sudden income loss for tutor. Allows parent to find a replacement.',
      sampleClause: '"Either party may end the tutoring arrangement with 2 weeks\' written notice. Notice should be sent by email or WhatsApp message."',
    },
    {
      section: 'Session Conduct & Safeguarding',
      importance: 'Critical',
      recommended: 'Online sessions: student\'s camera on. Parent or guardian aware of session. No recording without consent. For in-person: parent present or accessible, door open or window visible.',
      rationale: 'TTA guidelines and basic safeguarding best practice. Protects both the tutor and student. Required by most platforms and expected by parents of under-18 students.',
      sampleClause: '"For sessions with students under 18, a parent or guardian should be present in the building (for in-person sessions) or accessible by phone/email (for online sessions). Sessions will not be recorded without written consent from a parent/guardian."',
    },
    {
      section: 'Confidentiality',
      importance: 'High',
      recommended: 'Student\'s personal information, progress, and family circumstances are kept confidential. Not shared with third parties.',
      rationale: 'GDPR obligation (as a data controller). Builds parent trust.',
      sampleClause: '"All student information is kept strictly confidential and is used only for the purpose of tutoring. Information will not be shared with third parties without explicit written consent, except where legally required."',
    },
    {
      section: 'GDPR / Data Retention',
      importance: 'High (legal requirement)',
      recommended: 'State what data you collect (name, email, school year, academic level), how you use it, how long you retain it, and student/parent\'s right to request deletion.',
      rationale: 'UK GDPR (post-Brexit: UK GDPR + Data Protection Act 2018) requires a privacy notice for any personal data processing. Applies even to sole traders.',
      sampleClause: '"I collect and store: student name, academic level, subject(s), contact email, and session notes. Data is retained for the duration of tutoring and up to 2 years after final session for accounting purposes, then deleted. You can request deletion at any time by emailing [email]."',
    },
    {
      section: 'Liability Limitation',
      importance: 'Medium',
      recommended: 'State that the tutor provides educational support but does not guarantee specific exam results.',
      rationale: 'Prevents claims if a student does not achieve expected grades despite tutoring.',
      sampleClause: '"Tutoring provides educational support and guidance. While every effort is made to help students improve, specific exam results cannot be guaranteed. Academic outcomes depend on many factors including student effort, school teaching, and external circumstances."',
    },
    {
      section: 'Holiday & Session Pause Policy',
      importance: 'Medium',
      recommended: 'Sessions pause during school holidays (or continue by agreement). Session frequency is confirmed at start of each term.',
      rationale: 'Prevents misunderstanding about holiday-period sessions and reduces no-shows.',
      sampleClause: '"Regular sessions will be paused during school half-terms and holidays unless otherwise agreed. The tutoring schedule for each term will be confirmed at the start of that term."',
    },
  ],
  whereTuturorsGetTemplates: [
    'The Tutors\' Association (TTA) — members get a sample T&C template: thetutorsassociation.org.uk',
    'UK Tutors (uktutors.com/tutors/resources) — free guides and template documents',
    'Citizens Advice — general self-employment contract guidance',
    'Law Donut (lawdonut.co.uk) — free basic contract templates for self-employed',
    'Tutorwise profile T&Cs — the platform handles the booking contract; tutors should have supplemental T&Cs for their own direct-booking clients',
    'A solicitor (1-2 hours of legal advice: £200-400) for a bespoke contract if you are regularly dealing with high-value clients',
  ],
  importantNote: 'T&Cs are only enforceable if the client has been made aware of them BEFORE the first session. Send them before or at the point of booking — not after. Require acknowledgement (email reply or WhatsApp message confirming receipt).',
};

// ============================================================================
// PROFESSIONAL INDEMNITY & INSURANCE
// ============================================================================

export const TUTOR_INSURANCE = {
  overview: 'No insurance is legally required for private tutors in the UK, but the TTA and most professional advice strongly recommends it. Total annual cost for both policies: typically £80-160/year.',
  policies: [
    {
      type: 'Professional Indemnity (PI) Insurance',
      whatItCovers: 'Claims arising from your professional advice or teaching — e.g. a parent claims your tutoring advice caused their child to fail an exam, or that you gave incorrect academic guidance.',
      annualCost: '£50-100/year for £1m cover',
      recommendedProviders: ['Hiscox (hiscox.co.uk)', 'Markel (markel.com/uk)', 'PolicyBee (policybee.co.uk)', 'Simply Business (simplybusiness.co.uk)'],
      necessity: 'Highly recommended — particularly for tutors who give academic advice, predict grades, or are seen as accountable for results.',
    },
    {
      type: 'Public Liability Insurance',
      whatItCovers: 'Accidents and injuries involving third parties — relevant for in-person tutoring. E.g. a student trips over equipment in your home, or you accidentally damage property at a student\'s home.',
      annualCost: '£30-80/year for £1m cover',
      recommendedProviders: ['Hiscox', 'Simply Business', 'PolicyBee'],
      necessity: 'Recommended for all in-person tutors. Less critical for online-only tutors but still advisable.',
    },
    {
      type: 'Combined PI + PL Policy',
      whatItCovers: 'Both above in one policy',
      annualCost: '£80-150/year',
      recommendedProviders: ['Simply Business tutor policy', 'PolicyBee education package'],
      necessity: 'Most cost-effective option for tutors who do both in-person and online.',
    },
  ],
};

// ============================================================================
// DSPy-STYLE REVENUE INTELLIGENCE SIGNATURES
// ============================================================================

export const FULL_TIME_JUMP_SIGNATURE = {
  name: 'FullTimeJumpAdvisor',
  description: 'Analyse a tutor\'s current income, client base, and circumstances to give a personalised, honest assessment of whether they should go full-time tutoring, and a specific roadmap if they\'re not ready yet',
  inputs: ['monthly_income', 'regular_students', 'cash_reserve_months', 'weekly_enquiries', 'current_employment', 'region', 'monthly_expenses'],
  outputs: ['readiness_score', 'ready_to_jump', 'key_gaps', 'timeline', 'action_roadmap', 'financial_projection'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        monthly_income: 1400,
        regular_students: 11,
        cash_reserve_months: 2,
        weekly_enquiries: 2,
        current_employment: 'Teacher M4 (£38,000/year, full-time)',
        region: 'Bristol',
        monthly_expenses: 2100,
      },
      outputs: {
        readiness_score: 42,
        ready_to_jump: false,
        key_gaps: [
          'Income: £1,400/month is 56% of your £2,500 target. After July-August drop you\'d net ~£700-900/month — below your £2,100 expenses',
          'Client base: 11 students is close but you need 15+ with 6 long-term for safe transition',
          'Cash reserve: 2 months is not sufficient. Target 6 months (£12,600) before jumping',
          'Enquiries: 2/week is borderline — you need 4+ to sustain growth post-jump',
        ],
        timeline: '12-18 months to build to safe jump',
        action_roadmap: [
          'Month 1-3: Ask existing 11 students for referrals — target 15 regular students by April',
          'Month 4-6: Request 0.8 contract from school (one day/week freed for tutoring) — adds tutoring capacity without losing security',
          'Month 7-12: Build cash reserve to 4 months (£8,400). Grow to 18 students.',
          'Month 13-18: At 18+ students, £2,500+/month for 3 consecutive months, 4 months cash: assess jump',
          'Ideal exit: End of summer term (July), start full-time September — peak intake month',
        ],
        financial_projection: 'If you grow to 18 students at £42/hr avg by September: £3,024/month gross. After tax (~£500/month): ~£2,500 net. Viable in Bristol where median rent is ~£1,200/month.',
      },
      reasoning: 'This tutor is on a classic transition path — meaningful tutoring income but not yet at the safety threshold. The 0.8 contract strategy is the most risk-managed path: it frees one weekday for tutoring without losing employment income, pension contributions, or sick pay. The income gap in summer (July-August) is the critical risk — £700-900/month is below Bristol living costs. The 6-month cash reserve is the insurance policy against this.',
    },
    {
      inputs: {
        monthly_income: 3200,
        regular_students: 21,
        cash_reserve_months: 5,
        weekly_enquiries: 6,
        current_employment: 'Teacher UPS2 (£46,000/year, full-time)',
        region: 'London',
        monthly_expenses: 2800,
      },
      outputs: {
        readiness_score: 82,
        ready_to_jump: true,
        key_gaps: [
          'Cash reserve is slightly below the ideal 6 months (you have 5) — build to 6 months over the next 2 months before jumping',
          'London income replacement target is £55,000+ gross to fully replace UPS2 + benefits',
          'Current £38,400/year gross tutoring is at 70% of replacement income — viable but not fully replacing pension value',
        ],
        timeline: '2-3 months to readiness (leave at end of summer term)',
        action_roadmap: [
          'NOW: Give notice at half-term if leaving summer term (check your school\'s specific notice period)',
          'Months 1-2: Add 1 month to cash reserve (bring to 6 months = £16,800)',
          'Raise rates for all NEW bookings to £65-75/hr (you are currently underpriced for London with your client base)',
          'September: Full-time with 21 students — you will likely have 25+ by October from September intake',
          '6-month post-jump target: 25 students × £70/hr × 3 sessions/week = £5,250/month gross',
        ],
        financial_projection: 'At current income (£3,200/month): £38,400/year gross. After tax: ~£28,000 net. At target rate (£70/hr, 25 students): £52,500/year. After tax: ~£39,000 net. Exceeds your current net teacher salary.',
      },
      reasoning: 'This tutor is ready with one caveat: the cash reserve. 5 months is nearly ideal. The bigger strategic move is rate correction — they are charging below London market rates with strong credentials and a full client base. Raising rates to £65-75/hr is the highest-ROI action before jumping. With 21 regular students and 6 enquiries/week, the pipeline is strong. The jump to full-time will likely result in higher take-home than their current teaching salary within 6-12 months post-transition.',
    },
  ],
};

export const BUSINESS_STRUCTURE_ADVISOR_SIGNATURE = {
  name: 'BusinessStructureAdvisor',
  description: 'Advise a UK tutor on whether to register as a sole trader or limited company based on their income level, growth trajectory, and circumstances',
  inputs: ['annual_gross_income', 'expenses', 'growth_trajectory', 'personal_circumstances', 'risk_tolerance'],
  outputs: ['recommendation', 'tax_comparison', 'setup_steps', 'timeline', 'when_to_review'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        annual_gross_income: 28000,
        expenses: 3000,
        growth_trajectory: 'growing',
        personal_circumstances: 'part-time teacher, married, no employees',
        risk_tolerance: 'low',
      },
      outputs: {
        recommendation: 'Sole Trader',
        tax_comparison: {
          sole_trader: { taxable_profit: 25000, income_tax: 2486, national_insurance: 1134, total_tax: 3620, take_home: 21380 },
          ltd_company: { corp_tax: 4750, salary: 12570, dividend_income: 12430, dividend_tax: 1087, accountant_fees: 800, total_tax: 6637, take_home: 18363 },
          verdict: 'Sole trader wins by ~£3,000 take-home at this income level. Ltd company admin costs (accountant: £800/year) eliminate the small tax saving.',
        },
        setup_steps: ['Register with HMRC at gov.uk/register-for-self-assessment', 'Open a separate bank account for tutoring income', 'Use a simple spreadsheet or FreeAgent (free sole trader tier) to track income/expenses', 'Set aside 25% of income each month for tax'],
        timeline: 'Register within 3 months of first earning above £1,000. File first Self Assessment by 31 January following the tax year end.',
        when_to_review: 'Reconsider limited company structure when consistently earning £55,000+ per year from tutoring.',
      },
      reasoning: 'At £28,000 income, the sole trader vs limited company decision is clear: sole trader is simpler, cheaper, and produces higher take-home because the admin saving exceeds the tax saving. The limited company makes mathematical sense only above £50-55k gross profit.',
    },
  ],
};
