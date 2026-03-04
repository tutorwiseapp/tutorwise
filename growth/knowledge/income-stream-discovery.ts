/**
 * Growth Agent — Core Skill: Income Stream Discovery
 *
 * Helps any Tutorwise user discover, evaluate, and unlock income streams
 * they are not yet using. The Growth Agent's most differentiated capability —
 * no other tutoring platform advisor explains the full multi-stream
 * opportunity available to every user.
 *
 * Four income streams available to any user:
 *   1. Active tutoring (human tutor delivering sessions)
 *   2. AI Tutor ownership (creating a Sage agent, earning passively)
 *   3. Referral commission (referring tutors or clients to the platform)
 *   4. Organisation margin (running a tutoring agency)
 *
 * This skill determines which streams a user should unlock next, in what
 * order, and what the estimated revenue impact is.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IncomeStream {
  id: string;
  name: string;
  type: 'active' | 'passive' | 'semi-passive';
  effortLevel: 'low' | 'medium' | 'high';
  timeToFirstEarning: string;
  monthlyEarningRange: { min: number; max: number; typical: number };
  unlockConditions: UnlockCondition[];
  suitableFor: string[];
  notSuitableFor: string[];
  description: string;
  howItWorksOnTutorwise: string;
  realWorldExamples: IncomeStreamExample[];
  commonMistakes: string[];
  growthCeiling: string;
}

export interface UnlockCondition {
  condition: string;
  isMet?: boolean; // populated at runtime from user data
  howToMeet: string;
}

export interface IncomeStreamExample {
  personType: string;
  monthlyIncome: number;
  howAchieved: string;
  timeToAchieve: string;
}

export interface StreamCombination {
  id: string;
  streams: string[];
  personType: string;
  totalMonthlyIncome: number;
  description: string;
  effortNote: string;
}

export interface DiscoverySignature {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  chainOfThought: boolean;
  examples: DiscoveryExample[];
}

export interface DiscoveryExample {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  reasoning: string;
}

// ============================================================================
// INCOME STREAMS
// ============================================================================

export const INCOME_STREAMS: IncomeStream[] = [
  {
    id: 'active-tutoring',
    name: 'Active Human Tutoring',
    type: 'active',
    effortLevel: 'high',
    timeToFirstEarning: '1-8 weeks (time to find first student)',
    monthlyEarningRange: { min: 500, max: 5500, typical: 2000 },
    unlockConditions: [
      { condition: 'Have a subject you can teach', howToMeet: 'Any degree, A-Level pass, or professional expertise qualifies. Most common: school subjects (Maths, English, Sciences), professional skills (coding, languages, music).' },
      { condition: 'Have a Tutorwise profile with at least one listing', howToMeet: 'Create a listing in 10 minutes at tutorwise.co.uk/listings. Include subject, level, and price.' },
      { condition: 'DBS checked if teaching under-16s (UK)', howToMeet: 'Apply via umbrella body for 2-5 day turnaround. Basic DBS for over-16s only is not required by law but recommended.' },
    ],
    suitableFor: ['Qualified teachers', 'University graduates in any subject', 'Professionals with teachable skills', 'Musicians, artists, language speakers', 'Anyone with subject expertise above the level they are teaching'],
    notSuitableFor: ['People who cannot communicate clearly in English (or the subject language)', 'People with relevant criminal record (DBS-checked)', 'Subjects where you do not have demonstrably stronger knowledge than the student'],
    description: 'The core income stream — teaching students directly, 1:1 or in small groups. Time-intensive but highest trust, highest rates, and most direct feedback loop.',
    howItWorksOnTutorwise: 'Create listings → clients book sessions → sessions happen online or in-person → payment processed automatically → 80-90% of session value paid to tutor (10% platform fee; 80% if client was referred).',
    realWorldExamples: [
      { personType: 'Part-time teacher (3 days/week)', monthlyIncome: 1400, howAchieved: '10 students × 1.5hr/week × £35/hr avg × 4 weeks', timeToAchieve: '3-6 months to build 10 regular students' },
      { personType: 'Full-time specialist tutor (GCSE Maths, London)', monthlyIncome: 4200, howAchieved: '20 students × 1.5hr/week × £70/hr × 4 weeks', timeToAchieve: '12-24 months to build premium London practice' },
      { personType: 'Undergraduate tutoring GCSE subjects', monthlyIncome: 600, howAchieved: '6 students × 1hr/week × £25/hr × 4 weeks — term time only', timeToAchieve: '2-4 weeks to find first 2-3 students' },
    ],
    commonMistakes: ['Underpricing by 20-40% as a new tutor (hard to raise rates later)', 'Accepting students outside your expertise level out of desperation', 'Not having a cancellation policy — income leakage from last-minute cancellations', 'Relying entirely on one platform (platform risk)'],
    growthCeiling: 'Physical time ceiling: ~30-35 billable hours/week is sustainable. At £50/hr: £6,000-7,000/month gross maximum for solo tutor. Break the ceiling by: raising rates, adding group sessions, building AI tutor income.',
  },
  {
    id: 'ai-tutor-ownership',
    name: 'AI Tutor Ownership (Sage Agent)',
    type: 'passive',
    effortLevel: 'medium',
    timeToFirstEarning: '1-4 weeks (after setup + first booking)',
    monthlyEarningRange: { min: 50, max: 1500, typical: 300 },
    unlockConditions: [
      { condition: 'Create a Sage AI Tutor in AI Studio', howToMeet: 'Go to AI Studio → Create AI Tutor. Takes 15-30 minutes to configure subject, level, teaching style, and persona.' },
      { condition: 'AI Tutor subscription active (£10/month per agent)', howToMeet: 'Subscribe in AI Studio checkout. Tutor earns back this cost with a single 1-hr booking.' },
      { condition: 'AI Tutor listed on Tutorwise marketplace', howToMeet: 'Toggle listing visibility in AI Studio settings. Your AI tutor appears in marketplace search alongside human tutors.' },
    ],
    suitableFor: ['Any user who knows a subject well enough to configure the AI correctly', 'Teachers who want passive income from their expertise without extra sessions', 'Clients who understand a subject and want to monetise that knowledge passively', 'Tutors who regularly turn away students due to being fully booked'],
    notSuitableFor: ['Anyone not willing to configure and review the AI tutor occasionally', 'Subjects requiring physical demonstration (some music, art, sports coaching)'],
    description: 'Create an AI version of your tutoring persona. The AI delivers sessions to students — you earn a share of each session revenue without being present. Works 24/7, unlimited students, no scheduling conflicts.',
    howItWorksOnTutorwise: 'AI Tutor owner earns ~80% of session value per booking (10% platform fee, 10% if referred). Tutorwise handles delivery, billing, and quality. Owner gets monthly payout for all sessions delivered by their AI.',
    realWorldExamples: [
      { personType: 'Maths teacher who created an AI Maths tutor', monthlyIncome: 320, howAchieved: '8 students × 2 sessions/month × £20/session = £320. Passive — no sessions taught directly.', timeToAchieve: '4-8 weeks to build first regular student base for AI tutor' },
      { personType: 'Fully-booked GCSE English tutor, created AI agent for overflow', monthlyIncome: 480, howAchieved: 'AI tutor takes 12 students tutor cannot take. 12 × £40 = £480/month passively', timeToAchieve: '2-4 weeks — overflow from existing waitlist' },
      { personType: 'Client who studied Chemistry to degree level, created AI Chemistry tutor', monthlyIncome: 180, howAchieved: '6 GCSE students × 2 sessions × £15/session (AI-rate). First income stream from tutoring without teaching.', timeToAchieve: '3-6 weeks to get first AI tutor bookings' },
    ],
    commonMistakes: ['Creating an AI tutor and never reviewing or updating its knowledge', 'Pricing AI tutor too high — AI tutors typically price 20-30% below equivalent human tutors', 'Not promoting the AI tutor via referral links — it has the same referral attribution as human tutors'],
    growthCeiling: 'No ceiling — unlimited students, 24/7. Revenue scales with marketplace demand for the subject and quality of the AI tutor\'s configuration. A well-configured specialist AI tutor in high-demand subjects can earn £500-1,500/month passively.',
  },
  {
    id: 'referral-commission',
    name: 'Referral Commission',
    type: 'semi-passive',
    effortLevel: 'low',
    timeToFirstEarning: '2-12 weeks (time for referred person to sign up + complete first booking)',
    monthlyEarningRange: { min: 10, max: 800, typical: 120 },
    unlockConditions: [
      { condition: 'Have a Tutorwise account with a referral code', howToMeet: 'Every Tutorwise user automatically has a referral code and link. Find yours in the Referrals dashboard.' },
      { condition: 'Share referral link with at least one person', howToMeet: 'Share via WhatsApp, social media, email, or in conversation. The link captures attribution for 30 days.' },
    ],
    suitableFor: ['Anyone — no skills required', 'Clients who book tutors and can refer friends', 'Parents who know other parents with school-age children', 'Teachers who know other tutors', 'Community group leaders, bloggers, social media users', 'People who do not want to tutor but want to earn'],
    notSuitableFor: ['Nobody — literally any user can earn referral commissions with zero skill requirement'],
    description: 'The lowest-friction income stream on Tutorwise. Refer anyone — tutors or clients — and earn 10% of every booking they make, forever. Attribution is lifetime: one referral can pay commission for years.',
    howItWorksOnTutorwise: 'User clicks your referral link → signs up to Tutorwise → books a session → you earn 10% of the booking value → automatically credited to your balance → paid out weekly. No expiry on the attribution.',
    realWorldExamples: [
      { personType: 'Parent who referred 3 other parents', monthlyIncome: 90, howAchieved: '3 clients × 2 sessions/month × £35/session × 10% = £21/client × 3 = ~£63-90/month. Passive — just shared a link once.', timeToAchieve: '4-8 weeks for referrals to convert and start booking' },
      { personType: 'Tutor who actively grows referral network', monthlyIncome: 420, howAchieved: '14 converted referrals (mix of tutors and clients) each booking monthly. Avg £30/booking × 10% = £3/booking × 140 bookings = £420.', timeToAchieve: '6-12 months to build 14 converted referrals' },
      { personType: 'Organisation with 8 active referring members', monthlyIncome: 640, howAchieved: 'Each member refers 2 clients/month. 16 new clients × £40/session × 10% = £64 split between org and members.', timeToAchieve: '3-6 months for org referral flywheel to build momentum' },
    ],
    commonMistakes: ['Sharing the generic Tutorwise homepage link instead of your personal referral link (no commission attributed)', 'Giving up after first referral does not convert — pipeline building takes 2-3 months', 'Not following up with referred people stuck at "Signed Up" — a single nudge message converts 20-35% of stuck referrals'],
    growthCeiling: 'Theoretically unlimited. Constrained by network size and conversion rate. Actively managed referral networks of 50+ converted referrals can generate £500-800/month passively.',
  },
  {
    id: 'organisation-margin',
    name: 'Organisation Margin (Tutoring Agency)',
    type: 'semi-passive',
    effortLevel: 'high',
    timeToFirstEarning: '4-12 weeks (time to recruit tutors + get first bookings)',
    monthlyEarningRange: { min: 200, max: 5000, typical: 800 },
    unlockConditions: [
      { condition: 'Create an organisation on Tutorwise', howToMeet: 'Go to Organisation → Create Organisation. 5-10 minutes to set up.' },
      { condition: 'Recruit at least 2-3 active tutors as members', howToMeet: 'Invite existing contacts or recruit via referral. Tutors apply to join or you invite them by email.' },
      { condition: 'Configure booking commission / margin rate (default 20%)', howToMeet: 'In Organisation Settings → Commission. Set the % the organisation takes from each booking delivered by team members.' },
    ],
    suitableFor: ['Experienced tutors who want to scale beyond personal time', 'Former teachers with networks of other teachers', 'Education entrepreneurs', 'People with strong recruitment/network skills', 'Organisations (schools, colleges, charities) wanting to monetise educational provision'],
    notSuitableFor: ['Solo tutors happy with their current income level', 'Tutors who do not want management responsibility', 'Anyone without a reliable initial tutor network to recruit from'],
    description: 'Build a tutoring agency on Tutorwise. Recruit tutors, set an organisation margin (the percentage of each booking the org takes), and earn passive income from every session delivered by your team.',
    howItWorksOnTutorwise: 'Tutors join the organisation. When they deliver a session, the platform automatically deducts the org margin (configurable, default 20%) and credits it to the org\'s balance. Weekly payouts. The org also earns from referral commission on any clients the org brings to the platform.',
    realWorldExamples: [
      { personType: 'Experienced Maths tutor building a Maths agency', monthlyIncome: 960, howAchieved: '8 tutors × £1,200/month avg booking revenue × 10% org margin = £960/month. Plus personal tutoring income.', timeToAchieve: '3-6 months to recruit 8 active tutors and build client base' },
      { personType: 'Former Head of Department running specialist agency', monthlyIncome: 2400, howAchieved: '12 tutors × £1,500/month × 13% margin = £2,340/month. Operates as almost-passive once team is established.', timeToAchieve: '12-18 months to build to this scale' },
      { personType: 'Parent with school network starting a local agency', monthlyIncome: 350, howAchieved: '5 local tutors × £700/month × 10% = £350. Small but meaningful passive income from community connection.', timeToAchieve: '2-4 months with existing network' },
    ],
    commonMistakes: ['Setting margin too high — tutors leave if margin exceeds 25%. Sustainable rate: 10-20%.', 'Not providing any value to tutors beyond "we take a cut" — successful agencies provide leads, admin support, or brand value', 'Recruiting tutors who are unreliable — one bad tutor damages the org\'s reputation with clients'],
    growthCeiling: 'Scales linearly with team size and team earnings. 20 tutors × £2,000/month × 15% = £6,000/month from org alone. Most organisations plateau at 10-20 tutors without dedicated recruitment and management.',
  },
];

// ============================================================================
// RECOMMENDED STREAM COMBINATIONS
// ============================================================================

export const STREAM_COMBINATIONS: StreamCombination[] = [
  {
    id: 'tutor-plus-referral',
    streams: ['active-tutoring', 'referral-commission'],
    personType: 'Most tutors (90%+ of Tutorwise tutors should use this combination)',
    totalMonthlyIncome: 2200,
    description: '£2,000 active tutoring + £200 referral commission. Referral income requires almost zero extra effort — just sharing the link when naturally relevant.',
    effortNote: 'The +10% passive income from referrals is the lowest-effort upgrade available. Most tutors ignore it entirely.',
  },
  {
    id: 'tutor-plus-ai-plus-referral',
    streams: ['active-tutoring', 'ai-tutor-ownership', 'referral-commission'],
    personType: 'Fully-booked tutors with a waiting list',
    totalMonthlyIncome: 2700,
    description: 'Active tutoring capped by hours + AI tutor captures overflow demand + referral commission on network. An extra £700/month from the same expertise, no extra teaching hours.',
    effortNote: 'AI tutor setup: 2-3 hours once. Ongoing: 30 min/month to review and update. Referral: 30 min/month.',
  },
  {
    id: 'full-stack-income',
    streams: ['active-tutoring', 'ai-tutor-ownership', 'referral-commission', 'organisation-margin'],
    personType: 'Established tutors (3+ years, 15+ students, existing tutor network)',
    totalMonthlyIncome: 4500,
    description: '£2,500 tutoring + £400 AI tutor + £300 referral + £1,300 org margin (5 tutors × £2,600 × 10%). The compounding income model: each stream grows independently.',
    effortNote: 'High initial setup cost for org. Once established: 2-3 hours/week management. Most time goes to recruiting and maintaining tutor quality.',
  },
  {
    id: 'client-earner',
    streams: ['referral-commission', 'ai-tutor-ownership'],
    personType: 'Clients with subject knowledge who do not want to teach',
    totalMonthlyIncome: 350,
    description: 'A client who books tutors can also earn from the platform without teaching: referral commissions from friends who sign up, and passive income from an AI tutor they configured. No active teaching required.',
    effortNote: '£350/month = partially or fully funds their own tutoring costs. This is the "earn while you learn" model.',
  },
  {
    id: 'agent-model',
    streams: ['referral-commission', 'organisation-margin'],
    personType: 'Agents / brokers / education networkers',
    totalMonthlyIncome: 1200,
    description: 'No tutoring required. Build a referral network + small agency. This is a pure networking + platform play: connect supply (tutors) and demand (clients) and earn from both sides.',
    effortNote: 'The highest-leverage model for people with large networks but no subject expertise to tutor.',
  },
];

// ============================================================================
// SEQUENCING LOGIC — In What Order Should Users Unlock Streams?
// ============================================================================

export const UNLOCK_SEQUENCING = {
  description: 'The Growth Agent recommends income streams in a specific sequence based on user profile, not all at once. Overwhelming users with 4 streams simultaneously leads to paralysis.',
  sequenceRules: [
    {
      rule: 'Always recommend active tutoring first for tutors with no listings',
      rationale: 'Without a listed service, there is nothing to refer, delegate, or replicate with AI. Active tutoring is the foundation.',
      threshold: '0 active listings',
    },
    {
      rule: 'Recommend referral commission as first passive income add-on (for all users)',
      rationale: 'Zero skill required, zero cost to unlock, immediate eligibility. Every user should have their referral link shared in at least one channel.',
      threshold: '0 converted referrals',
    },
    {
      rule: 'Recommend AI Tutor once tutor has 8+ active students',
      rationale: 'Need enough social proof and subject credibility to make the AI tutor worth configuring. Before 8 students, focus on building the human tutor practice.',
      threshold: 'active_students >= 8 AND ai_tutors_created == 0',
    },
    {
      rule: 'Recommend Organisation once tutor has 15+ students AND referral commission already active',
      rationale: 'Organisation setup requires management effort. Only worthwhile once the core practice is established and the tutor understands the platform well enough to guide others.',
      threshold: 'active_students >= 15 AND converted_referrals >= 3',
    },
    {
      rule: 'For clients: recommend referral first, AI tutor second',
      rationale: 'Clients do not need subject expertise to earn via referrals. AI tutor ownership requires subject knowledge — recommend only if client has a degree or professional expertise in a tutoring-suitable subject.',
      threshold: 'active_role == client AND active_streams.length == 0',
    },
  ],
};

// ============================================================================
// INCOME POTENTIAL CALCULATOR
// ============================================================================

export const INCOME_POTENTIAL_CALCULATOR = {
  description: 'Calculate the estimated monthly income potential for each unlocked stream based on user\'s current data',

  activeHumanTutoring: (
    currentStudents: number,
    avgRate: number,
    avgSessionsPerStudentPerMonth: number,
    potentialStudents: number,
  ) => {
    const currentIncome = currentStudents * avgRate * avgSessionsPerStudentPerMonth;
    const potentialIncome = potentialStudents * avgRate * avgSessionsPerStudentPerMonth;
    return {
      currentMonthly: currentIncome,
      potentialMonthly: potentialIncome,
      uplift: potentialIncome - currentIncome,
      limitingFactor: potentialStudents > 25 ? 'Time ceiling reached — consider AI tutor for overflow' : 'Client acquisition',
    };
  },

  referralCommission: (
    convertedReferrals: number,
    avgBookingsPerReferralPerMonth: number,
    avgBookingValue: number,
    commissionRate: number = 0.10,
  ) => {
    const current = convertedReferrals * avgBookingsPerReferralPerMonth * avgBookingValue * commissionRate;
    // Potential: if tutor grows to 15 converted referrals (realistic with active effort over 6-12 months)
    const potential = 15 * avgBookingsPerReferralPerMonth * avgBookingValue * commissionRate;
    return {
      currentMonthly: Math.round(current),
      potentialMonthly: Math.round(potential),
      uplift: Math.round(potential - current),
      limitingFactor: 'Network reach and active sharing',
    };
  },

  aiTutorOwnership: (
    aiTutorsCreated: number,
    avgStudentsPerAiTutor: number,
    avgSessionsPerStudentPerMonth: number,
    avgSessionValue: number,
    ownerSharePercent: number = 0.80,
  ) => {
    if (aiTutorsCreated === 0) {
      return {
        currentMonthly: 0,
        potentialMonthly: Math.round(6 * avgSessionsPerStudentPerMonth * avgSessionValue * ownerSharePercent),
        uplift: Math.round(6 * avgSessionsPerStudentPerMonth * avgSessionValue * ownerSharePercent),
        limitingFactor: 'Not created yet — takes 30 minutes to set up',
      };
    }
    const current = aiTutorsCreated * avgStudentsPerAiTutor * avgSessionsPerStudentPerMonth * avgSessionValue * ownerSharePercent;
    const potential = aiTutorsCreated * 12 * avgSessionsPerStudentPerMonth * avgSessionValue * ownerSharePercent;
    return {
      currentMonthly: Math.round(current),
      potentialMonthly: Math.round(potential),
      uplift: Math.round(potential - current),
      limitingFactor: 'AI tutor marketing and listing visibility',
    };
  },

  organisationMargin: (
    orgMembers: number,
    avgMemberMonthlyBookingRevenue: number,
    orgMarginPercent: number,
    potentialMembers: number = orgMembers + 4,
  ) => {
    const current = orgMembers * avgMemberMonthlyBookingRevenue * orgMarginPercent;
    const potential = potentialMembers * avgMemberMonthlyBookingRevenue * orgMarginPercent;
    return {
      currentMonthly: Math.round(current),
      potentialMonthly: Math.round(potential),
      uplift: Math.round(potential - current),
      limitingFactor: 'Tutor recruitment and retention',
    };
  },
};

// ============================================================================
// DSPy-STYLE INCOME STREAM DISCOVERY SIGNATURE
// ============================================================================

export const INCOME_STREAM_DISCOVERY_SIGNATURE: DiscoverySignature = {
  name: 'IncomeStreamDiscoveryAdvisor',
  description: 'Analyse a Tutorwise user\'s profile to identify which income streams they are not using, prioritise the highest-impact next stream to unlock, and provide a specific action plan',
  inputs: ['active_role', 'active_streams', 'profile_data', 'bookings', 'referrals', 'ai_tutors', 'organisation'],
  outputs: ['income_potential_index', 'unlocked_streams', 'locked_streams', 'next_stream_to_unlock', 'unlock_action_plan', 'estimated_monthly_uplift'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        active_role: 'tutor',
        active_streams: ['active-tutoring'],
        profile_data: { subjects: ['GCSE Maths', 'A-Level Maths'], region: 'Manchester', caas_score: 74, experience_years: 4 },
        bookings: { total_students: 14, avg_hourly_rate: 40, monthly_income: 1680 },
        referrals: { converted: 0, total: 2, signed_up: 2 },
        ai_tutors: { created: 0 },
        organisation: null,
      },
      outputs: {
        income_potential_index: 38,
        unlocked_streams: [
          { stream: 'Active Tutoring', monthly_income: 1680, status: 'active', score: 74 },
        ],
        locked_streams: [
          { stream: 'Referral Commission', monthly_income: 0, potential: 180, status: 'not_started', note: 'You have 2 people stuck at Signed Up — £60 in pending commission' },
          { stream: 'AI Tutor Ownership', monthly_income: 0, potential: 320, status: 'not_started', note: 'You teach GCSE & A-Level Maths — highest-demand AI tutor subjects on the platform' },
          { stream: 'Organisation Margin', monthly_income: 0, potential: 700, status: 'not_started', note: 'You have 4 years experience — viable in 6-12 months once referral and AI streams are running' },
        ],
        next_stream_to_unlock: 'Referral Commission',
        unlock_action_plan: [
          'Step 1 (TODAY — 5 minutes): Open your Tutorwise referral dashboard. Copy your referral link.',
          'Step 2 (THIS WEEK): Send a WhatsApp message to the 2 people who signed up but haven\'t booked: "Hi! Saw you signed up to Tutorwise — with mock exams coming up, happy to recommend a Maths tutor if useful. Just reply!"',
          'Step 3 (THIS MONTH): When any existing student asks if you know a good tutor for another subject, share your referral link alongside the recommendation.',
          'Step 4 (NEXT MONTH): Once referral commission is active and earning, we\'ll set up your AI Maths tutor — est. +£320/month passively.',
        ],
        estimated_monthly_uplift: '£180-320 per month by adding referral commission and AI tutor streams over the next 60 days.',
      },
      reasoning: 'This tutor is using only 1 of 4 income streams. He\'s not asking for referrals at all (0 conversions from 2 signups) and has not created an AI tutor despite being highly qualified in the highest-demand AI tutor subject (GCSE/A-Level Maths). The sequencing recommendation is: referral first (easiest win, 2 stuck referrals to convert), then AI tutor (30 minutes to set up, passive £300+/month). Organisation is too early at 4 years experience with no referral or AI stream running yet.',
    },
    {
      inputs: {
        active_role: 'client',
        active_streams: [],
        profile_data: { degree: 'Chemistry, UCL (2:1)', region: 'London', caas_score: null },
        bookings: { total_as_client: 12, monthly_spend: 480 },
        referrals: { converted: 0 },
        ai_tutors: { created: 0 },
        organisation: null,
      },
      outputs: {
        income_potential_index: 8,
        unlocked_streams: [],
        locked_streams: [
          { stream: 'Referral Commission', monthly_income: 0, potential: 120, status: 'not_started', note: 'You spend £480/month on tutoring. 3 referrals would earn back ~£144/month — covering almost a full session.' },
          { stream: 'AI Tutor Ownership', monthly_income: 0, potential: 280, status: 'not_started', note: 'UCL Chemistry 2:1 is exactly the qualification to create a high-value GCSE/A-Level Chemistry AI tutor.' },
          { stream: 'Active Tutoring', monthly_income: 0, potential: 0, status: 'not_applicable', note: 'You\'re a client — this stream is available but not your primary focus.' },
          { stream: 'Organisation', monthly_income: 0, potential: 0, status: 'not_yet', note: 'Viable once referral and AI streams are established.' },
        ],
        next_stream_to_unlock: 'Referral Commission',
        unlock_action_plan: [
          'Step 1: Find your referral link in your Tutorwise dashboard.',
          'Step 2: You\'re a UCL student / recent grad — share your referral link in your student group chats. University students needing GCSE retake tutors are a perfect match.',
          'Step 3: When a friend mentions struggling with exams or looking for tutoring, share your link naturally.',
          'After referrals are earning: Create a GCSE/A-Level Chemistry AI Tutor — you\'re more qualified than 80% of Chemistry tutors on the platform.',
        ],
        estimated_monthly_uplift: 'Referral commission: £96-144/month (3-4 converted referrals booking monthly). AI Tutor: +£200-350/month once created. Total: up to £500/month — more than offsetting your £480/month tutoring spend.',
      },
      reasoning: 'A client with a UCL Chemistry degree who is spending £480/month on tutoring is leaving significant money on the table. They are eligible for the same income streams as tutors — they just don\'t know it. Referral commission first (zero skill required, their university network is a natural channel). Then AI tutor ownership — a UCL Chemistry 2:1 is a higher qualification than many GCSE/A-Level Chemistry tutors. They could earn more from their AI tutor each month than they spend on their own tutoring.',
    },
  ],
};
