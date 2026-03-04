/**
 * Growth Agent — Core Skill: Referral Strategy
 *
 * UK-primary, internationally-aware knowledge base for building and optimising
 * a tutor's referral network. Covers channel effectiveness, outreach templates,
 * pipeline stages, delegation mechanics, community-specific tactics, and
 * the Tutorwise referral commission system.
 *
 * Sources: TTA guidance, tutor community research, Sutton Trust reports,
 * TutorHunt / MyTutor community forums, Reddit r/uktutors (2024-2025).
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ReferralChannel {
  id: string;
  name: string;
  roiRank: number;          // 1 = highest ROI
  effort: 'low' | 'medium' | 'high';
  timeToFirstResult: string;
  bestFor: string[];
  ukSpecific: boolean;
  internationalNotes?: string;
  tactics: string[];
  pitfalls: string[];
}

export interface OutreachTemplate {
  id: string;
  useCase: string;
  audience: string;
  template: string;
  notes: string;
  conversionInsight: string;
}

export interface ReferralPipelineBenchmark {
  stage: string;
  description: string;
  typicalConversionRate: number;  // % who move to next stage
  averageDaysAtStage: number;
  dropoffReasons: string[];
  reactivationTactics: string[];
}

export interface DelegationStrategy {
  scenario: string;
  howItWorks: string;
  partnerType: string;
  valueProp: string;
  setupSteps: string[];
  revenueExample: string;
}

// ============================================================================
// REFERRAL CHANNEL EFFECTIVENESS
// ============================================================================

export const REFERRAL_CHANNELS: ReferralChannel[] = [
  {
    id: 'existing-student-referrals',
    name: 'Referrals from Existing Students & Parents',
    roiRank: 1,
    effort: 'low',
    timeToFirstResult: '1-4 weeks',
    bestFor: ['all tutor types', 'any subject', 'any level'],
    ukSpecific: false,
    internationalNotes: 'Universally the #1 channel across UK, USA, Australia, Singapore. Cultural strength varies — very strong in Singapore and Hong Kong where word-of-mouth drives nearly all tutoring decisions.',
    tactics: [
      'Ask explicitly — most tutors never ask. Simply saying "If you know any other Year 11 students who need Maths help, I have a space" generates 3-5x more referrals than waiting',
      'Ask at the RIGHT moment — immediately after a result milestone (grade improved, exam passed), not mid-engagement',
      'Make referral easy — share your Tutorwise referral link directly in a WhatsApp message, not just a vague mention',
      'Structured referral incentive — "Recommend a friend and I\'ll give you a free 30-min session" — works but is secondary to simply asking clearly',
      'Thank referrers immediately — acknowledge when a referred student books, even informally',
    ],
    pitfalls: [
      'Never ask in the first 1-2 sessions — build trust first',
      'Asking too broadly ("do you know anyone?") is less effective than specific ("do you know any other Year 11s in your school struggling with GCSE Maths?")',
      'Not following through — if a referral converts, acknowledge it to the referrer',
    ],
  },
  {
    id: 'google-reviews-seo',
    name: 'Google Business Profile & Search Reviews',
    roiRank: 2,
    effort: 'low',
    timeToFirstResult: '4-12 weeks (SEO lag)',
    bestFor: ['in-person tutors', 'local area specialists', 'tutors building own brand'],
    ukSpecific: false,
    tactics: [
      'Set up Google Business Profile (free) — even online tutors can create one with a service area',
      'After every successful result, send a direct Google Review link via text/WhatsApp (not email — lower open rate)',
      'Tutors with 10+ Google reviews receive 40-60% more organic enquiries than those with zero',
      'Ask for reviews within 24 hours of a milestone — "I\'m so glad you got Grade 7! If you have a moment, a quick Google review would really help my business: [link]"',
      'Respond to every review (positive or negative) — shows professionalism to prospective parents browsing',
    ],
    pitfalls: [
      'Do not offer payment or incentives for reviews — against Google guidelines and potentially TTA guidelines',
      'Do not review-bomb competitors — always focus on generating your own authentic reviews',
      'Generic review requests ("please leave me a review") convert less well than milestone-triggered requests',
    ],
  },
  {
    id: 'nextdoor-local',
    name: 'Nextdoor App (UK Highly Effective)',
    roiRank: 3,
    effort: 'low',
    timeToFirstResult: '1-2 weeks',
    bestFor: ['in-person tutors', 'primary and GCSE level', 'local area focus'],
    ukSpecific: true,
    internationalNotes: 'Also effective in USA and Australia where Nextdoor is strong. Less relevant in HK, Singapore where WeChat/WhatsApp groups dominate.',
    tactics: [
      'Post a simple introductory post: "Hi [area] neighbours — I\'m a local maths tutor (GCSE, A-Level) with availability from September. Happy to answer questions about [exam board] revision."',
      'Search for parents asking "does anyone know a good tutor" — these are warm leads',
      'Join local area Nextdoor groups beyond just your immediate neighbourhood — expand reach by 2-3 postcodes',
      'Comment helpfully on education discussions (SATs, GCSE, 11+) — establishes credibility before direct promotion',
      'Seasonal posts: back to school (Aug/Sept), January mock exams, pre-Easter revision',
    ],
    pitfalls: [
      'Overtly promotional posts get flagged as spam — be conversational, not salesy',
      'Only post when you genuinely have availability — do not post and then be unavailable',
    ],
  },
  {
    id: 'facebook-parent-groups',
    name: 'Facebook Local Parent Groups',
    roiRank: 4,
    effort: 'medium',
    timeToFirstResult: '1-3 weeks',
    bestFor: ['primary school tutors', 'GCSE / 11+ tutors', 'in-person and online'],
    ukSpecific: false,
    tactics: [
      'Find local groups: "[Town] Parents", "[School Name] Parents", "[Area] Mums & Dads" — often 1,000-10,000 members',
      'Request to join and introduce yourself when asked "do you recommend a tutor" — respond directly',
      'Post at the right time: August-September (back to school planning), December-January (post-mock panic)',
      'Offer to answer questions about the curriculum publicly — builds authority before conversion',
      'Share your Tutorwise referral link in responses — passive income if they sign up via it',
    ],
    pitfalls: [
      'Many groups prohibit direct advertising — post helpfully first, offer contact via DM',
      'Engage with the group regularly before promoting, or posts get minimal traction',
    ],
  },
  {
    id: 'school-networks',
    name: 'School Networks & Teacher Referrals',
    roiRank: 5,
    effort: 'high',
    timeToFirstResult: '4-12 weeks',
    bestFor: ['tutors with teaching backgrounds', 'SEND specialists', 'exam-prep specialists'],
    ukSpecific: true,
    tactics: [
      'Build relationships with classroom teachers / HODs (Heads of Department) — they regularly recommend private tutors to parents',
      'Schools with Pupil Premium budgets may commission external tutors — approach SENCo or Deputy Head with an evidence-based proposal',
      'School notice boards: declining (many schools prohibit), but still worth asking at indie schools and prep schools',
      'Independent / private school parents are a high-value segment — network with school admin and parent associations',
      'Easter revision courses / "Holiday Intensives" advertised via school newsletters (with permission)',
    ],
    pitfalls: [
      'Approaching head teachers cold rarely works — warm introduction through a known teacher is far more effective',
      'Ofsted does not regulate private tutors — do not imply school endorsement where none exists',
      'GDPR: schools cannot share student/parent contact details — all referrals must come through parents voluntarily',
    ],
  },
  {
    id: 'linkedin-professional',
    name: 'LinkedIn (Adults / Professional / University)',
    roiRank: 6,
    effort: 'medium',
    timeToFirstResult: '4-8 weeks',
    bestFor: ['adult learners', 'professional exam prep (ACCA, CFA, IELTS, UCAT)', 'corporate training', 'university-level tutors'],
    ukSpecific: false,
    internationalNotes: 'Particularly strong in UAE and Singapore for professional development and adult English tutoring.',
    tactics: [
      'LinkedIn headline: "GCSE/A-Level Chemistry Tutor | 5★ Reviews | Available Now" — searchable',
      'Post content: exam tips, subject explainers, "What I wish students knew about [exam]" — builds follower base',
      'Direct message parents who post about their child\'s exam stress — warm, helpful DM (not a sales pitch)',
      'Target professionals seeking: IELTS/TOEFL, CFA, ACCA, driving theory, coding bootcamp supplemental tutoring',
    ],
    pitfalls: [
      'LinkedIn audience is professional — content must be professional in tone, not student-friendly casualness',
      'Follower growth is slow — LinkedIn is a long-game channel',
    ],
  },
  {
    id: 'whatsapp-community',
    name: 'WhatsApp Community Groups',
    roiRank: 7,
    effort: 'medium',
    timeToFirstResult: '1-4 weeks',
    bestFor: ['South Asian community tutors', 'local area tutors', 'community group members'],
    ukSpecific: false,
    internationalNotes: 'WhatsApp is the dominant referral channel in UAE, Singapore, HK, and across South Asian diaspora communities in the UK. Essential for tutors serving these communities.',
    tactics: [
      'Join community WhatsApp groups relevant to your subject/area — religious groups, cultural associations, parent networks',
      'Share your Tutorwise referral link when asked for tutor recommendations',
      'Create your own WhatsApp broadcast list — send seasonal reminders to past enquirers (with consent)',
      'Exam season reminder messages: "Mocks coming up — I still have 2 spaces this January"',
    ],
    pitfalls: [
      'Unsolicited group promotions get you removed — only share when directly relevant or asked',
      'Response to WhatsApp enquiries must be within 2-4 hours — slow response loses leads',
    ],
  },
  {
    id: 'tutorwise-referral-programme',
    name: 'Tutorwise Referral Programme',
    roiRank: 2,
    effort: 'low',
    timeToFirstResult: '2-8 weeks per referral',
    bestFor: ['all users', 'passive income', 'building a referral network'],
    ukSpecific: false,
    tactics: [
      'Share your unique Tutorwise referral link when recommending the platform to tutors or clients',
      'The link captures attribution permanently — you earn 10% commission on every future booking from people who signed up via your link',
      'Use your referral link in: social bios, WhatsApp messages, email signatures, your own website',
      'Build a delegation partnership — if another tutor regularly sends clients your way, set up delegation so they earn commission automatically from your bookings',
      'Track your referral pipeline in the Tutorwise dashboard — identify who is stuck at "Signed Up" and send a gentle nudge',
    ],
    pitfalls: [
      'Referral commission only activates when the referred person completes a booking — sharing the link alone is not enough',
      'Do not spam your link — share it contextually when genuinely relevant to the conversation',
    ],
  },
];

// ============================================================================
// OUTREACH TEMPLATES
// ============================================================================

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: 'student-referral-ask',
    useCase: 'Asking an existing student / parent for a referral',
    audience: 'Existing student or parent, after milestone achievement',
    template: `"I'm so glad [student name] got their [grade/result] — that's a brilliant outcome after all their hard work!

One thing that would really help my tutoring business is if you know any other Year [X] students in [school/area] who are finding [subject] challenging — I have a couple of spaces at the moment. If you think of anyone, feel free to share my details or I can send you a link to my Tutorwise profile.

Thanks again for being such a great student to work with!"`,
    notes: 'Specificity matters — "Year 11 students in your school" is more actionable than "anyone". Timing is everything — send within 24 hours of the result.',
    conversionInsight: 'Parent-to-parent referrals have the highest conversion rate of any channel (~40-60% of referred leads become bookings) because trust is pre-established.',
  },
  {
    id: 'complementary-tutor-partnership',
    useCase: 'Reaching out to a complementary tutor for cross-referral',
    audience: 'Another tutor on Tutorwise or via local network — different subject or level',
    template: `"Hi [Name], I noticed we're both tutoring in [area/subject area] — I teach [subject] and see you specialise in [their subject].

I often get enquiries I can't take on (wrong subject / full at the moment) and I'd love to refer them to someone I trust. Would you be open to a mutual referral arrangement? I'd send you students who need [their subject], and you could send me anyone needing [your subject].

If it makes sense, we can even set up a formal referral arrangement through Tutorwise so we both earn a small commission from referrals — happy to explain how it works.

Best, [Your name]"`,
    notes: 'Frame it as mutual benefit, not just a favour request. The Tutorwise referral commission adds a financial incentive that makes the conversation more concrete.',
    conversionInsight: 'Tutor-to-tutor partnerships are underutilised. A Maths tutor + English tutor partnership serving the same school year group is a natural fit — many students need both subjects.',
  },
  {
    id: 'win-back-lapsed-student',
    useCase: 'Re-engaging a student who went quiet after sessions ended or paused',
    audience: 'Former student / parent with no booking in 60+ days',
    template: `"Hi [Name], hope [student name] is getting on well with [subject]!

I have a couple of spaces opening up [in September / next half term / this January] and thought of you — especially with [mocks / GCSEs / A-Levels] coming up.

If you'd like to pick up where we left off, I'm happy to do a quick call to catch up on where [student] is at. No pressure at all — just wanted to reach out in case it's useful.

[Your name]"`,
    notes: 'One message only. Do not follow up if no response. Timing: send in August for September return, or in December for January mocks period.',
    conversionInsight: '20-35% of lapsed students re-book when a tutor sends a personalised, well-timed re-engagement message. The key is specific timing (upcoming exam/season) rather than a generic "hope you\'re well".',
  },
  {
    id: 'google-review-request',
    useCase: 'Requesting a Google / platform review after a result',
    audience: 'Student / parent who just achieved a result',
    template: `"I'm so pleased [student name] got [their Grade 7 / their 11+ offer / their A in Chemistry]!

If you have a moment, a short Google review would genuinely help other parents find me — it only takes 2 minutes: [Google review link]

Thank you so much — it's been a pleasure working with [student name]."`,
    notes: 'Include the direct link — not a generic request. Reduce friction: the less work they have to do, the higher the completion rate. Send via WhatsApp rather than email for 3x higher open/action rate.',
    conversionInsight: 'Tutors who ask for reviews at milestone moments get 5-8x more reviews than those who wait or use generic review request emails.',
  },
  {
    id: 'delegation-partner-proposal',
    useCase: 'Proposing a delegation arrangement to a local business / organisation',
    audience: 'Coffee shop, library, school, community centre, parent network admin',
    template: `"Hi [Name/Business Name],

I'm a local [subject] tutor and I've been recommending your [venue/group/service] to my students for a while.

I wanted to explore whether we could set up a simple referral arrangement — if your customers/members sign up to Tutorwise through my referral link, you'd automatically earn a small commission on their tutoring bookings (typically 5-10% of session value). No admin needed on your end — it's tracked automatically.

If you display my QR code or share my link, any tutor or student who signs up through it earns you passive income. Happy to explain more if useful — it's a free arrangement and could be worthwhile if your customers are parents with school-age children.

[Your name] | [Tutorwise profile link]"`,
    notes: 'Works best with: independent coffee shops near secondary schools, library study spaces, children\'s activity centres, parent community group admins, school alumni networks.',
    conversionInsight: 'Local business delegation partnerships are underexplored by most tutors. A single coffee shop with a QR code displayed, serving parents picking up after school, can generate 3-10 referrals per term.',
  },
  {
    id: 'facebook-group-intro',
    useCase: 'Introducing yourself in a local parent Facebook group',
    audience: 'Local parent Facebook group (1,000+ members)',
    template: `"Hi [Group Name] parents!

I'm a [subject] tutor based in [area] and I help [Year X-Y] students with [GCSE/A-Level/11+]. I've just got a couple of spaces for [September / this term] and thought I'd introduce myself here.

I specialise in [AQA/Edexcel/specific topic area] and typically work with students who are targeting [grade/goal]. Happy to answer any questions about the curriculum, revision strategies, or whether tutoring is right for your child at this stage.

You can see my profile and reviews on Tutorwise: [link]

Feel free to DM me if you'd like a chat!"`,
    notes: 'Post in August (September prep), early January (post-Christmas exam panic), and late March (pre-exam final push). Check group rules on promoting services first.',
    conversionInsight: 'A well-timed, helpful-not-salesy Facebook post in a large parent group (2,000+ members) typically generates 2-8 enquiries within 48 hours.',
  },
];

// ============================================================================
// REFERRAL PIPELINE BENCHMARKS
// ============================================================================

export const REFERRAL_PIPELINE_BENCHMARKS: ReferralPipelineBenchmark[] = [
  {
    stage: 'Referred',
    description: 'Referral link clicked or referral code shared. Tutorwise records attribution.',
    typicalConversionRate: 40,
    averageDaysAtStage: 7,
    dropoffReasons: [
      'Person not ready to sign up (just browsing)',
      'Wrong timing (summer, not yet school age)',
      'Cookie expired before signup (30-day window)',
    ],
    reactivationTactics: [
      'Referrer sends a direct follow-up message with a personalised recommendation',
      'Share a specific listing that matches the referred person\'s need (not just the homepage)',
    ],
  },
  {
    stage: 'Signed Up',
    description: 'Person created a Tutorwise account via your referral link. Referrals row created.',
    typicalConversionRate: 35,
    averageDaysAtStage: 21,
    dropoffReasons: [
      'Signed up but browsing — not yet committed to booking',
      'Couldn\'t find a tutor matching their needs',
      'Price concern at browsing stage',
      'Booked on a different platform instead',
    ],
    reactivationTactics: [
      'Send a personalised message: "I noticed you signed up to Tutorwise via my link — happy to recommend a tutor for your specific needs if helpful"',
      'Suggest a specific tutor on the platform who matches their need (if you know their subject/level)',
      'Referral auto-expires at 90 days — if nearing expiry, a timely nudge increases conversion significantly',
    ],
  },
  {
    stage: 'Converted',
    description: 'First booking completed. 10% referral commission earned. Lifetime attribution active.',
    typicalConversionRate: 100,
    averageDaysAtStage: 0,
    dropoffReasons: [],
    reactivationTactics: [],
  },
  {
    stage: 'Expired',
    description: 'Referral auto-expired after 90 days without first booking.',
    typicalConversionRate: 5,
    averageDaysAtStage: 0,
    dropoffReasons: ['90-day window elapsed before first booking'],
    reactivationTactics: [
      'Contact the person directly and share your referral link again',
      'Note: a new referral attribution will require them to click your link again',
    ],
  },
];

// ============================================================================
// DELEGATION STRATEGIES
// ============================================================================

export const DELEGATION_STRATEGIES: DelegationStrategy[] = [
  {
    scenario: 'Coffee shop near a secondary school',
    howItWorks: 'Tutor sets up Tutorwise listing delegation pointing to the coffee shop\'s account. Coffee shop displays QR code or shares referral link. When clients sign up via the link and book, the coffee shop earns a commission split.',
    partnerType: 'Local business (coffee shop, stationery shop, library, children\'s activity centre)',
    valueProp: 'Zero-effort passive income for the business. Revenue from existing foot traffic with school parents.',
    setupSteps: [
      'Create a listing on Tutorwise with delegation enabled',
      'Set the delegate to the business\'s Tutorwise referral code',
      'Print QR code for the business to display',
      'Send the business a monthly summary of conversions',
    ],
    revenueExample: 'If 3 parents sign up per month via the coffee shop QR code and each books 4 sessions at £40/hr: 3 × 4 × £40 = £480/month in referred revenue. Referral commission to coffee shop: £48/month. Tutor earns from these clients directly.',
  },
  {
    scenario: 'Organisation with multiple tutors doing referrals',
    howItWorks: 'Organisation owner sets up an organisation on Tutorwise. Members share the org\'s referral code. Referral commissions are split between the org (50%) and the individual member (50%) by default, configurable.',
    partnerType: 'Tutoring agency, school network, university society, parent collective',
    valueProp: 'Org earns passive income from member referral activity. Members earn more through org brand/reach.',
    setupSteps: [
      'Create an organisation on Tutorwise',
      'Set referral commission split in org settings',
      'Invite members to join and share the org referral code',
      'Track pipeline and commissions in org dashboard',
    ],
    revenueExample: 'Org with 5 active referring members, each referring 2 students/month. 10 new students × £35/hr avg × 4 sessions/month = £1,400/month referred GMV. 10% commission = £140/month to org + members combined.',
  },
];

// ============================================================================
// SEASONAL REFERRAL CALENDAR (UK-primary)
// ============================================================================

export const UK_REFERRAL_CALENDAR = {
  january: {
    demandLevel: 'very-high',
    trigger: 'Post-Christmas mock exam panic. Results back, students and parents suddenly urgent.',
    referralTactics: ['Send win-back messages to September lapsed students', 'Post in Facebook parent groups about January spaces', 'Share referral link in WhatsApp groups before mocks'],
    message: '"Mock exams are around the corner — I have a couple of spaces in January for students targeting Grade 7-9 in [subject]. Let me know if you\'d like to chat."',
  },
  february: {
    demandLevel: 'high',
    trigger: 'Post-mock recovery. Many students realise they need help. Half-term revision.',
    referralTactics: ['Offer half-term intensive group sessions — shareable event', 'Ask current students if they have friends who struggled in mocks'],
  },
  march: {
    demandLevel: 'high',
    trigger: 'Pre-exam final push. GCSE/A-Level students 2-3 months from exams.',
    referralTactics: ['Promote any remaining spaces urgently', 'Easter revision course announcement'],
  },
  april: {
    demandLevel: 'very-high',
    trigger: 'Easter revision. Exams 4-6 weeks away. Peak demand — many tutors are full.',
    referralTactics: ['Refer students you cannot take to colleagues (reciprocal referral arrangement)', 'If full: waitlist signups via referral link — earn commission even when not tutoring'],
  },
  may_june: {
    demandLevel: 'very-high',
    trigger: 'GCSE and A-Level exam period. Existing students increase frequency.',
    referralTactics: ['Book students for September before summer gap', 'Plant seeds for post-result referrals: "If [student] gets their grade, ask them to tell friends"'],
  },
  july: {
    demandLevel: 'low',
    trigger: 'School holidays. Major income drop (-40-60%). Counter-cycle opportunities.',
    referralTactics: [
      '11+ prep — grammar school entrance preparation STARTS in Year 5 summer (counter-cyclical)',
      'University admissions prep (personal statements, UCAS, September university starters)',
      'Adult learner IELTS / ESOL / professional exam prep — not school-seasonal',
      'Refer students to other tutors and earn commission passively during quiet period',
    ],
  },
  august: {
    demandLevel: 'low-to-medium',
    trigger: 'A-Level results day (mid-August) and GCSE results day (late August). Emotional peak for families.',
    referralTactics: [
      'Message all September starters: "Excited for September — looking forward to working together again"',
      'A-Level results day: contact students who got their grades to ask for Google reviews',
      'GCSE clearing support: students who missed grades may need university access / resit tutor referrals',
      'Back-to-school Facebook group posts for September intake',
    ],
  },
  september: {
    demandLevel: 'very-high',
    trigger: 'Biggest intake period of the year. New GCSE/A-Level students start. New academic year urgency.',
    referralTactics: ['September is THE time to ask current students for referrals — everyone is back, fresh start mindset', 'School notice boards, local Facebook posts, Nextdoor introduction posts'],
  },
  october: {
    demandLevel: 'high',
    trigger: 'First half-term. Parents assess how child is settling into new year. GCSE coursework deadlines begin.',
    referralTactics: ['Half-term revision sessions — promote to existing students and ask them to share', 'Parents are fresh from parent evenings — referral timing window'],
  },
  november: {
    demandLevel: 'high',
    trigger: 'Pre-Christmas mock exams. Second intake mini-surge.',
    referralTactics: ['Mock exam prep urgency — "I have 2 spaces for November mocks prep"'],
  },
  december: {
    demandLevel: 'medium',
    trigger: 'Pre-Christmas. End-of-term. Results from November mocks land.',
    referralTactics: ['Christmas message to all students and parents — goodwill touch point', 'Plant seeds for January: "Happy to squeeze in sessions the week before Christmas if needed"'],
  },
};

// ============================================================================
// DSPy-STYLE REFERRAL STRATEGY SIGNATURE
// ============================================================================

export const REFERRAL_STRATEGY_SIGNATURE = {
  name: 'TutorReferralStrategyAdvisor',
  description: 'Analyse a tutor\'s current referral pipeline and generate a personalised referral growth strategy with specific actions, timing, and outreach messages',
  inputs: ['referral_pipeline', 'bookings', 'profile', 'region', 'current_month'],
  outputs: ['pipeline_health_score', 'stuck_referrals_analysis', 'channel_recommendations', 'outreach_messages', 'thirty_day_plan'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        referral_pipeline: {
          total: 8,
          referred: 3,
          signed_up: 4,
          converted: 1,
          expired: 0,
          commission_earned_lifetime: 45,
        },
        bookings: { total: 12, subjects: ['GCSE Maths', 'A-Level Maths'], region: 'Birmingham' },
        profile: { caas_score: 72, reviews: 8, has_delegation: false },
        current_month: 'january',
      },
      outputs: {
        pipeline_health_score: 38,
        stuck_referrals_analysis: '4 referrals are stuck at "Signed Up" — they joined Tutorwise but haven\'t booked. This is £120+ in pending commission sitting idle. January is the perfect time to nudge them — mock exam panic is your best conversion catalyst.',
        channel_recommendations: [
          'You\'re in Birmingham — WhatsApp community and local Facebook parent groups are your fastest channels right now (January is peak intake)',
          'You have 8 reviews but only 1 referral conversion — you\'re not asking existing students for referrals. After 12 sessions completed, you likely have 4-6 parents who would refer you if asked directly',
          'No delegation set up — Birmingham has dense South Asian community networks where a delegation partnership with a local community group could generate 5-10 referrals/term',
        ],
        outreach_messages: [
          {
            for: 'Stuck "Signed Up" referrals (send this week)',
            message: '"Hi! I noticed you signed up to Tutorwise a few weeks ago. With mocks coming up this month, I\'m happy to recommend a GCSE or A-Level Maths tutor if that\'s useful — I know the platform well. Just reply and I\'ll point you in the right direction."',
          },
          {
            for: 'Current students (ask for referral this month)',
            message: '"January is a really high-pressure time for Year 11 students — if you know anyone in your school who\'s finding Maths tough ahead of mocks, I have one space this month. Happy for you to pass on my details."',
          },
        ],
        thirty_day_plan: [
          'Week 1: Send personalised message to all 4 stuck "Signed Up" referrals — mock exam urgency is your best hook right now',
          'Week 2: Ask your 3 most engaged current students for referrals (specific ask: "Year 11 friends in your school")',
          'Week 3: Post in 2 local Birmingham parent Facebook groups (check for rules) — January intro post',
          'Week 4: Set up Tutorwise delegation for at least one local community connection',
        ],
      },
      reasoning: 'January is the #1 intake month in the UK — mock exam anxiety creates urgency that makes referral conversion much easier than other months. The stuck "Signed Up" referrals are the quickest win (they already have accounts, just need a nudge to book). The lack of direct referral asking from existing students is the biggest missed opportunity given his review count and session count.',
    },
  ],
};
