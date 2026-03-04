/**
 * Growth Agent — Tool Executor
 *
 * Executes Growth Agent tool calls by retrieving relevant knowledge from
 * the skill files and combining it with live user metrics.
 *
 * Each tool returns a structured payload containing relevant skill knowledge
 * + computed values from user metrics. The LLM synthesizes this into advice.
 *
 * @module growth/tools/executor
 */

import type { GrowthToolCall, GrowthToolResult, GrowthUserMetrics } from './types';
import { getToolByName } from './definitions';

// Skill knowledge imports
import {
  UK_PRICING_BENCHMARKS,
  INTERNATIONAL_PRICING_BENCHMARKS,
  LISTING_QUALITY_CRITERIA,
  QUALIFICATION_WEIGHTS,
  SAFEGUARDING_REQUIREMENTS,
  UK_EDUCATION_POLICY,
} from '../knowledge/profile-listing-audit';

import {
  REFERRAL_CHANNELS,
  OUTREACH_TEMPLATES,
  REFERRAL_PIPELINE_BENCHMARKS,
  DELEGATION_STRATEGIES,
  UK_REFERRAL_CALENDAR,
} from '../knowledge/referral-strategy';

import {
  INCOME_PATTERNS,
  UK_SEASONAL_PATTERNS,
  FULL_TIME_JUMP_CRITERIA,
  FULL_TIME_JUMP_CALCULATOR,
  UK_BUSINESS_STRUCTURES,
  UK_TAX_OBLIGATIONS,
  TUTOR_TERMS_AND_CONDITIONS,
  TUTOR_INSURANCE,
} from '../knowledge/revenue-intelligence';

import {
  INCOME_STREAMS,
  STREAM_COMBINATIONS,
  UNLOCK_SEQUENCING,
  INCOME_POTENTIAL_CALCULATOR,
} from '../knowledge/income-stream-discovery';

import {
  CAREER_DECISIONS,
  REGISTRATION_STEPS,
  TUTOR_TC_GUIDE,
  COMPLIANCE_OBLIGATIONS,
  COMMON_TUTOR_QUESTIONS,
} from '../knowledge/business-setup-compliance';

// Map month number (1-12) to UK_REFERRAL_CALENDAR key
const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may_june', 'may_june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

// ============================================================================
// EXECUTOR CLASS
// ============================================================================

export class GrowthToolExecutor {
  private userMetrics: GrowthUserMetrics | null = null;

  initialize(metrics: GrowthUserMetrics): void {
    this.userMetrics = metrics;
  }

  async execute(toolCall: GrowthToolCall): Promise<GrowthToolResult> {
    const tool = getToolByName(toolCall.function.name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${toolCall.function.name}` };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      const data = await this.executeFunction(toolCall.function.name, args);
      return { success: true, data };
    } catch (error) {
      console.error(`[GrowthAgent] Tool error (${toolCall.function.name}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeFunction(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'audit_profile':           return this.auditProfile(args);
      case 'benchmark_pricing':       return this.benchmarkPricing(args);
      case 'discover_income_streams': return this.discoverIncomeStreams(args);
      case 'plan_referral_strategy':  return this.planReferralStrategy(args);
      case 'assess_full_time_jump':   return this.assessFullTimeJump(args);
      case 'get_business_setup_guide': return this.getBusinessSetupGuide(args);
      case 'forecast_revenue':        return this.forecastRevenue(args);
      case 'set_growth_goal':         return this.setGrowthGoal(args);
      default:
        throw new Error(`Unimplemented tool: ${name}`);
    }
  }

  // ============================================================================
  // TOOL IMPLEMENTATIONS
  // ============================================================================

  private async auditProfile(args: Record<string, unknown>): Promise<unknown> {
    const subject = String(args.subject || 'General');
    const level = String(args.level || 'GCSE');
    const market = String(args.market || 'uk');
    const currentRate = Number(args.currentRate || (this.userMetrics?.hourlyRate ?? 0) / 100);
    const listingWordCount = Number(args.listingWordCount ?? this.userMetrics?.listingWordCount ?? 0);
    const qualifications = (args.qualifications as string[]) || this.userMetrics?.qualifications || [];
    const hasProfilePhoto = Boolean(args.hasProfilePhoto ?? true);
    const hasFirstLessonOffer = Boolean(args.hasFirstLessonOffer ?? false);

    // Select the relevant pricing benchmark
    const benchmarks = market === 'uk' ? UK_PRICING_BENCHMARKS : INTERNATIONAL_PRICING_BENCHMARKS;
    const levelBenchmark = benchmarks.find(b =>
      b.level?.toLowerCase().includes(level.toLowerCase()) ||
      level.toLowerCase().includes(b.level?.toLowerCase() ?? '')
    ) ?? benchmarks[0];

    const subjectRate = levelBenchmark?.subjects?.find(s =>
      s.subject.toLowerCase().includes(subject.toLowerCase()) ||
      subject.toLowerCase().includes(s.subject.toLowerCase())
    ) ?? levelBenchmark?.subjects?.[0];

    // Listing score: simple heuristic based on available data
    let listingScore = 50; // base
    if (hasProfilePhoto) listingScore += 10;
    if (hasFirstLessonOffer) listingScore += 5;
    if (qualifications.length > 0) listingScore += 15;
    if (listingWordCount >= 150) listingScore += 10;
    if (listingWordCount >= 250) listingScore += 5;
    if (subjectRate && currentRate >= subjectRate.minRate) listingScore += 5;
    listingScore = Math.min(listingScore, 100);

    // Top improvement suggestions based on gaps
    const quickWins: string[] = [];
    if (!hasProfilePhoto) quickWins.push('Add a professional profile photo (+10 listing score)');
    if (listingWordCount < 150) quickWins.push(`Expand description to 150+ words (currently ~${listingWordCount})`);
    if (qualifications.length === 0) quickWins.push('Add your qualifications (QTS, degree, subject specialism)');
    if (!hasFirstLessonOffer) quickWins.push('Offer a free or discounted first lesson to boost conversion');
    if (subjectRate && currentRate < subjectRate.minRate) {
      quickWins.push(`Consider raising your rate — market minimum for ${subject} ${level} is £${subjectRate.minRate}/hr`);
    }

    return {
      listingScore,
      subject,
      level,
      market,
      pricing: {
        currentRate,
        marketMin: subjectRate?.minRate,
        marketTypical: subjectRate?.typicalRate,
        marketPremium: subjectRate?.premiumRate,
        demandLevel: subjectRate?.demandLevel,
      },
      quickWins: quickWins.slice(0, 3),
      qualifications,
      qualificationContext: QUALIFICATION_WEIGHTS.slice(0, 5), // top qualification types for reference
      listingQualityCriteria: LISTING_QUALITY_CRITERIA.slice(0, 6), // key criteria for LLM to reference
      safeguarding: SAFEGUARDING_REQUIREMENTS.find(r => r.country === market) ?? SAFEGUARDING_REQUIREMENTS[0],
      educationPolicy: market === 'uk' ? UK_EDUCATION_POLICY : null,
      allBenchmarks: levelBenchmark,
    };
  }

  private async benchmarkPricing(args: Record<string, unknown>): Promise<unknown> {
    const subject = String(args.subject || 'Maths');
    const level = String(args.level || 'GCSE');
    const market = String(args.market || 'uk');
    const currentRate = Number(args.currentRate ?? (this.userMetrics?.hourlyRate ?? 0) / 100);
    const isLondon = Boolean(args.isLondon ?? false);
    const yearsExperience = Number(args.yearsExperience ?? 0);

    const benchmarks = market === 'uk' ? UK_PRICING_BENCHMARKS : INTERNATIONAL_PRICING_BENCHMARKS;

    // Find level match
    let levelBenchmark = benchmarks.find(b =>
      b.level?.toLowerCase().includes(level.toLowerCase()) ||
      level.toLowerCase().includes(b.level?.toLowerCase() ?? '')
    ) ?? benchmarks[0];

    // London override
    if (isLondon && market === 'uk') {
      const londonBenchmark = UK_PRICING_BENCHMARKS.find(b => b.region === 'London');
      if (londonBenchmark) levelBenchmark = londonBenchmark;
    }

    const subjectRate = levelBenchmark?.subjects?.find(s =>
      s.subject.toLowerCase().includes(subject.toLowerCase()) ||
      subject.toLowerCase().includes(s.subject.toLowerCase())
    ) ?? levelBenchmark?.subjects?.[0];

    const typical = subjectRate?.typicalRate ?? 45;
    const rateGap = currentRate - typical;

    return {
      subject, level, market,
      currency: levelBenchmark?.currency ?? 'GBP',
      rates: {
        current: currentRate,
        marketMin: subjectRate?.minRate,
        marketTypical: typical,
        marketPremium: subjectRate?.premiumRate,
      },
      assessment: {
        gap: rateGap,
        percentageOfTypical: currentRate > 0 ? Math.round((currentRate / typical) * 100) : 0,
        verdict: rateGap < -10
          ? 'Significantly underpriced'
          : rateGap < -3
          ? 'Slightly underpriced'
          : rateGap > 15
          ? 'Premium — justify with proven results'
          : 'Competitive',
        canRaiseNow: yearsExperience >= 1 && rateGap < 0,
      },
      revenueImpactOf5Raise: 5 * 20,   // £5/hr × 20 hrs/month
      revenueImpactOf10Raise: 10 * 20, // £10/hr × 20 hrs/month
      annualImpactOf10Raise: 10 * 20 * 12,
      demandLevel: subjectRate?.demandLevel,
      notes: subjectRate?.notes,
      allLevelBenchmarks: benchmarks.map(b => ({ level: b.level, region: b.region })),
    };
  }

  private async discoverIncomeStreams(args: Record<string, unknown>): Promise<unknown> {
    const activeStreams = (args.activeStreams as string[]) ?? [];
    const studentCount = Number(args.studentCount ?? this.userMetrics?.activeStudents ?? 0);
    const monthlyIncome = Number(args.monthlyIncome ?? (this.userMetrics?.monthlyIncome ?? 0) / 100);
    const userRole = String(args.userRole ?? this.userMetrics?.role ?? 'tutor');

    // Determine unlock status for each of the 4 streams
    const streamAnalysis = INCOME_STREAMS.map(stream => {
      const isActive = activeStreams.includes(stream.id);

      // Check unlock eligibility
      let eligible = false;
      if (stream.id === 'active-tutoring') eligible = true; // always eligible
      if (stream.id === 'referral-commission') eligible = true; // zero barrier
      if (stream.id === 'ai-tutor-ownership') eligible = studentCount >= 8;
      if (stream.id === 'organisation-margin') eligible = studentCount >= 15;

      // Client role: only referral + AI tutor streams make sense
      if (userRole === 'client' && stream.id === 'active-tutoring') eligible = false;

      const status = isActive ? 'active' : eligible ? 'unlocked' : 'locked';

      // Compute estimated monthly potential
      let estimatedPotential = stream.monthlyEarningRange.typical;
      if (stream.id === 'referral-commission') {
        // 10% of avg booking value (£50) × estimated monthly bookings per referral (2)
        estimatedPotential = Math.max(studentCount * 10, stream.monthlyEarningRange.min);
      }

      return {
        id: stream.id,
        name: stream.name,
        type: stream.type,
        status,
        effortLevel: stream.effortLevel,
        timeToFirstEarning: stream.timeToFirstEarning,
        estimatedMonthlyPotential: estimatedPotential,
        monthlyEarningRange: stream.monthlyEarningRange,
        unlockConditions: stream.unlockConditions,
        description: stream.description,
        howItWorksOnTutorwise: stream.howItWorksOnTutorwise,
        commonMistakes: stream.commonMistakes,
      };
    });

    const inactiveUnlocked = streamAnalysis.filter(s => s.status === 'unlocked');
    const missedPotential = inactiveUnlocked.reduce((sum, s) => sum + s.estimatedMonthlyPotential, 0);

    // Find best combination
    const recommended = STREAM_COMBINATIONS.find(combo => {
      if (userRole === 'client') return combo.id === 'client-earner';
      if (userRole === 'agent') return combo.id === 'agent-model';
      if (studentCount >= 15) return combo.id === 'full-stack-income';
      if (studentCount >= 8) return combo.id === 'tutor-plus-ai-plus-referral';
      return combo.id === 'tutor-plus-referral';
    }) ?? STREAM_COMBINATIONS[0];

    return {
      streams: streamAnalysis,
      activeCount: activeStreams.length,
      inactiveUnlocked: inactiveUnlocked.length,
      missedMonthlyPotential: missedPotential,
      recommendedCombination: recommended,
      unlockSequence: UNLOCK_SEQUENCING.sequenceRules,
      priorityNextStep: inactiveUnlocked[0]
        ? `Unlock ${inactiveUnlocked[0].name} — estimated +£${inactiveUnlocked[0].estimatedMonthlyPotential}/mo with minimal effort`
        : 'All streams active — focus on scaling each one',
    };
  }

  private async planReferralStrategy(args: Record<string, unknown>): Promise<unknown> {
    const referralCount = Number(args.referralCount ?? this.userMetrics?.referralCount ?? 0);
    const convertedReferrals = Number(args.convertedReferrals ?? this.userMetrics?.convertedReferrals ?? 0);
    const userType = String(args.userType ?? this.userMetrics?.role ?? 'tutor');
    const focus = String(args.focus ?? 'channels');
    const currentMonth = Number(args.currentMonth ?? new Date().getMonth() + 1);

    // Select most relevant channels for this user type
    const allChannelsSorted = [...REFERRAL_CHANNELS].sort((a, b) => a.roiRank - b.roiRank);
    const topChannels = userType === 'client'
      ? allChannelsSorted.filter(c => ['tutorwise-referral-programme', 'whatsapp-community', 'nextdoor-local'].includes(c.id)).slice(0, 3)
      : userType === 'agent'
      ? allChannelsSorted.filter(c => ['tutorwise-referral-programme', 'linkedin-professional', 'existing-student-referrals'].includes(c.id)).slice(0, 3)
      : allChannelsSorted.slice(0, 4);

    // Templates relevant to user type
    const relevantTemplates = OUTREACH_TEMPLATES.filter(t => {
      if (userType === 'client') return ['student-referral-ask', 'google-review-request'].includes(t.id);
      if (userType === 'agent') return ['delegation-partner-proposal', 'student-referral-ask'].includes(t.id);
      return true;
    }).slice(0, 3);

    // Seasonal advice from UK_REFERRAL_CALENDAR
    const monthKey = MONTH_KEYS[currentMonth - 1] as keyof typeof UK_REFERRAL_CALENDAR;
    const seasonalAdvice = UK_REFERRAL_CALENDAR[monthKey] ?? UK_REFERRAL_CALENDAR.september;

    // Conversion rate health
    const conversionRate = referralCount > 0 ? convertedReferrals / referralCount : 0;
    const benchmarkRate = (REFERRAL_PIPELINE_BENCHMARKS.find(b => b.stage === 'Converted')?.typicalConversionRate ?? 35) / 100;

    return {
      topChannels,
      templates: relevantTemplates,
      seasonalAdvice: { month: monthKey, ...seasonalAdvice },
      pipelineHealth: {
        totalReferrals: referralCount,
        converted: convertedReferrals,
        conversionRatePercent: Math.round(conversionRate * 100),
        benchmarkPercent: Math.round(benchmarkRate * 100),
        verdict: referralCount === 0
          ? 'No referrals yet — start with Tutorwise referral link (zero effort required)'
          : conversionRate >= benchmarkRate
          ? 'Above benchmark — your outreach is working'
          : 'Below benchmark — try the student referral message template',
      },
      delegationStrategies: userType !== 'client' ? DELEGATION_STRATEGIES : [],
      pipelineBenchmarks: REFERRAL_PIPELINE_BENCHMARKS,
      projectedMonthlyEarnings: convertedReferrals * 5, // ~£5/converted referral/month at 10% on avg £50 booking
    };
  }

  private async assessFullTimeJump(args: Record<string, unknown>): Promise<unknown> {
    const monthlyIncome = Number(args.monthlyTutoringIncome ?? (this.userMetrics?.monthlyIncome ?? 0) / 100);
    const activeStudents = Number(args.activeStudents ?? this.userMetrics?.activeStudents ?? 0);
    const payScale = String(args.teacherPayScale ?? 'M4');
    const cashReserves = Number(args.cashReservesMonths ?? this.userMetrics?.cashReservesMonths ?? 0);
    const hasWaitingList = Boolean(args.hasWaitingList ?? false);
    const isLondon = Boolean(args.isLondon ?? false);
    const hasTLR = Boolean(args.hasTLR ?? false);

    // Simple readiness score (0-100) based on key factors
    let readinessScore = 0;
    if (monthlyIncome >= 2000) readinessScore += 25;
    else readinessScore += Math.round((monthlyIncome / 2000) * 25);

    if (activeStudents >= 12) readinessScore += 20;
    else readinessScore += Math.round((activeStudents / 12) * 20);

    if (cashReserves >= 6) readinessScore += 20;
    else readinessScore += Math.round((cashReserves / 6) * 20);

    if (hasWaitingList) readinessScore += 20;
    if (this.userMetrics?.referralCount && this.userMetrics.referralCount > 0) readinessScore += 5;
    if (this.userMetrics?.hasAITutor) readinessScore += 5;
    if (monthlyIncome >= 2500) readinessScore += 5; // bonus for above-ideal threshold

    readinessScore = Math.min(readinessScore, 100);

    // Salary estimate by pay scale
    const salaryMap: Record<string, { national: number; london: number }> = {
      M1: { national: 31650, london: 34659 },
      M2: { national: 33483, london: 36761 },
      M3: { national: 35555, london: 39063 },
      M4: { national: 37884, london: 41476 },
      M5: { national: 40469, london: 44102 },
      M6: { national: 43685, london: 47228 },
      UPS1: { national: 45584, london: 49237 },
      UPS2: { national: 47421, london: 51082 },
      UPS3: { national: 49084, london: 52745 },
    };
    const salaryData = salaryMap[payScale] ?? salaryMap['M4'];
    const annualSalary = isLondon ? salaryData.london : salaryData.national;
    const pensionValue = Math.round(annualSalary * 0.232); // TPS employer contribution
    const effectivePkg = annualSalary + pensionValue;
    const requiredTutoringMonthly = Math.ceil(effectivePkg / 12 / 0.7); // 70% net after self-employed tax

    return {
      readinessScore,
      verdict: readinessScore >= 75
        ? 'Ready — the numbers support the jump'
        : readinessScore >= 50
        ? 'Getting close — a few more months of building'
        : 'Not yet — build income and cash reserves first',
      inputs: { monthlyIncome, activeStudents, cashReserves, hasWaitingList, payScale, isLondon, hasTLR },
      financialComparison: {
        payScale,
        annualSalary,
        pensionValue,
        effectiveTotalPackage: effectivePkg,
        requiredTutoringMonthlyToMatch: requiredTutoringMonthly,
        currentMonthlyTutoring: monthlyIncome,
        monthlyGap: requiredTutoringMonthly - monthlyIncome,
        tlrNote: hasTLR ? 'You have a TLR allowance — factor this into your replacement income calculation' : null,
      },
      criteria: FULL_TIME_JUMP_CRITERIA, // raw criteria for LLM to reference
      decisionMatrix: FULL_TIME_JUMP_CALCULATOR.decisionMatrix,
      transitionalStrategies: FULL_TIME_JUMP_CALCULATOR.transitionalStrategies,
      optimalTiming: (() => {
        const m = new Date().getMonth() + 1;
        if (m >= 4 && m <= 6) return 'Give notice now → start September (highest intake month)';
        if (m >= 7 && m <= 9) return 'September has started — consider giving notice for January transition';
        if (m >= 10 && m <= 12) return 'Give notice by Oct 31 → leave at Christmas | or give notice Apr 30 → leave at Easter';
        return 'Give notice by Apr 30 → leave at Easter | or Apr 30 → leave summer';
      })(),
      pensionWarning: 'TPS (Teachers\' Pension Scheme) is defined benefit at 1/57th accrual per year. Leaving teaching means losing this — factor it in.',
      noticePeriodsNote: 'STPCD notice dates: resign by 31 Oct (leave 31 Dec), 30 Apr (leave 30 Jun), 30 Jun (leave 31 Aug)',
    };
  }

  private async getBusinessSetupGuide(args: Record<string, unknown>): Promise<unknown> {
    const topic = String(args.topic ?? 'sole_trader');
    const country = String(args.country ?? 'uk');
    const annualIncome = Number(args.annualIncome ?? (this.userMetrics?.monthlyIncome ?? 0) * 12 / 100);
    const specificQuestion = args.specificQuestion ? String(args.specificQuestion) : null;

    const payload: Record<string, unknown> = { topic, country, annualIncome };

    if (specificQuestion) payload.specificQuestion = specificQuestion;

    switch (topic) {
      case 'sole_trader':
        return {
          ...payload,
          structure: UK_BUSINESS_STRUCTURES.find(s => s.type?.toLowerCase().includes('sole')) ?? UK_BUSINESS_STRUCTURES[0],
          steps: REGISTRATION_STEPS.filter(r => r.structure === 'sole_trader' && r.country === country),
          tax: UK_TAX_OBLIGATIONS.filter(t => ['self-assessment', 'income tax', 'national insurance', 'trading allowance'].some(k => t.obligation?.toLowerCase().includes(k))),
          commonQuestions: COMMON_TUTOR_QUESTIONS.slice(0, 3),
          recommended: annualIncome < 55000,
        };

      case 'limited_company':
        return {
          ...payload,
          structure: UK_BUSINESS_STRUCTURES.find(s => s.type?.toLowerCase().includes('limited')) ?? UK_BUSINESS_STRUCTURES[1],
          steps: REGISTRATION_STEPS.filter(r => r.structure === 'limited_company' && r.country === country),
          recommended: annualIncome >= 55000,
          switchoverNote: 'Below ~£55,000 annual income, sole trader is simpler and net income is often higher after accountant fees.',
          optimalSplit: '£12,570 salary (NI-free threshold) + remainder as dividends (8.75% basic rate)',
          accountantCost: '£500-1,200/year — required for Ltd co (deductible as a business expense)',
        };

      case 'tax':
        return {
          ...payload,
          obligations: UK_TAX_OBLIGATIONS,
          tradingAllowance: 'First £1,000 of tutoring income is tax-free (Trading Allowance — no need to register below this)',
          selfAssessmentNote: 'Register for Self Assessment by 5 October after your first trading year',
          paymentsOnAccountWarning: 'In year 2, HMRC charges current year tax PLUS 50% advance payment — plan for this "double hit"',
          mtdNote: 'Making Tax Digital (MTD) for Income Tax: required from April 2026 if income >£50,000',
        };

      case 'tc':
        return {
          ...payload,
          guide: TUTOR_TC_GUIDE,
          mostCritical: 'Cancellation policy — be explicit about notice period and payment terms to protect your income',
          templateSources: [
            'The Tutors\' Association (tutors-association.co.uk) — free T&C template',
            'UK Tutors (uktutors.com) — tutor agreement template',
            'Law Donut (lawdonut.co.uk) — general service agreement',
            'Citizens Advice — basic self-employment contracts',
          ],
          gdprNote: 'You must provide students with a privacy notice (how you store their data). ICO registration: £40/year if you hold digital personal data.',
        };

      case 'compliance':
        return {
          ...payload,
          obligations: COMPLIANCE_OBLIGATIONS,
          insurance: TUTOR_INSURANCE,
          dbsNote: country === 'uk'
            ? 'Enhanced DBS: £38 application + £13/year Update Service (recommended — saves £38 per re-check)'
            : 'Check country-specific working-with-children requirements',
        };

      case 'career_decision':
        return {
          ...payload,
          decisions: CAREER_DECISIONS,
          commonQuestions: COMMON_TUTOR_QUESTIONS,
        };

      case 'insurance':
        return {
          ...payload,
          insurance: TUTOR_INSURANCE,
          recommendation: 'Minimum cover: PI (Professional Indemnity) + PL (Public Liability)',
          topProviders: ['Hiscox', 'Markel', 'PolicyBee', 'Simply Business'],
          cost: '£80-150/year for combined PI + PL (tax-deductible as a business expense)',
        };

      default:
        return { error: `Unknown topic: ${topic}` };
    }
  }

  private async forecastRevenue(args: Record<string, unknown>): Promise<unknown> {
    const currentMonthlyIncome = Number(args.currentMonthlyIncome ?? (this.userMetrics?.monthlyIncome ?? 0) / 100);
    const streamMix = (args.streamMix as string[]) ?? ['active-tutoring'];
    const currentMonthNum = Number(args.currentMonth ?? new Date().getMonth() + 1);
    const growthGoal = Number(args.growthGoal ?? 0);

    // Build 12-month forecast using seasonal patterns
    const forecast = Array.from({ length: 12 }, (_, i) => {
      const monthIndex = (currentMonthNum - 1 + i) % 12;
      const seasonal = UK_SEASONAL_PATTERNS[monthIndex];
      if (!seasonal) return null;

      // Reduce seasonal volatility if user has multiple income streams
      let smoothingFactor = 0;
      if (streamMix.includes('ai-tutor-ownership')) smoothingFactor += 0.15;
      if (streamMix.includes('referral-commission')) smoothingFactor += 0.10;
      if (streamMix.includes('organisation-margin')) smoothingFactor += 0.10;

      const factor = 1 + (seasonal.incomeFactor - 1) * (1 - smoothingFactor);
      const projected = Math.round(currentMonthlyIncome * factor);

      return {
        month: seasonal.month,
        demandIndex: seasonal.demandIndex,
        projectedIncome: projected,
        variancePct: Math.round((factor - 1) * 100),
        keyDrivers: seasonal.keyDrivers,
        topTutorAction: seasonal.tutorActions?.[0] ?? null,
        onTrackForGoal: growthGoal > 0 ? projected >= growthGoal : undefined,
      };
    }).filter(Boolean);

    const incomes = forecast.map(m => m!.projectedIncome);
    const avgMonthly = Math.round(incomes.reduce((s, v) => s + v, 0) / incomes.length);
    const peakMonths = forecast.filter(m => m!.demandIndex >= 140).map(m => m!.month);
    const troughMonths = forecast.filter(m => m!.demandIndex <= 80).map(m => m!.month);
    const minIncome = Math.min(...incomes);
    const dropPct = currentMonthlyIncome > 0 ? Math.round(((currentMonthlyIncome - minIncome) / currentMonthlyIncome) * 100) : 0;

    // Current income tier (find the pattern closest to current monthly income)
    const sortedPatterns = [...INCOME_PATTERNS].sort((a, b) => a.grossMonthlyIncome - b.grossMonthlyIncome);
    const currentTier = sortedPatterns.find(p => currentMonthlyIncome <= p.grossMonthlyIncome);
    const nextTierIdx = currentTier ? sortedPatterns.indexOf(currentTier) + 1 : 1;
    const nextTier = sortedPatterns[nextTierIdx];

    return {
      forecast,
      summary: {
        averageMonthly: avgMonthly,
        annualProjection: avgMonthly * 12,
        peakMonths,
        troughMonths,
        incomeDropInTroughs: `${dropPct}%`,
        currentTier: currentTier?.tier,
        nextTier: nextTier?.tier,
        toReachNextTier: nextTier?.grossMonthlyIncome
          ? `+£${nextTier.grossMonthlyIncome - currentMonthlyIncome}/mo`
          : 'Peak tier',
      },
      seasonalWarning: `Income may drop ~${dropPct}% in slowest months (${troughMonths.join(', ')}). Build a cash buffer during ${peakMonths[0] ?? 'September'}.`,
      goalTracking: growthGoal > 0 ? {
        goal: growthGoal,
        monthsOnTrack: forecast.filter(m => m!.projectedIncome >= growthGoal).length,
        firstMonthOnTrack: forecast.find(m => m!.projectedIncome >= growthGoal)?.month ?? 'Not in 12-month window',
      } : null,
    };
  }

  private async setGrowthGoal(args: Record<string, unknown>): Promise<unknown> {
    // The actual DB write is done by the API route after tool execution
    return {
      goalType: args.goalType,
      targetMonthlyIncome: args.targetMonthlyIncome,
      targetDate: args.targetDate,
      notes: args.notes,
      savedAt: new Date().toISOString(),
      message: `Goal recorded: ${args.goalType}${args.targetMonthlyIncome ? ` — target £${args.targetMonthlyIncome}/mo` : ''}${args.targetDate ? ` by ${args.targetDate}` : ''}`,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const growthToolExecutor = new GrowthToolExecutor();

export default GrowthToolExecutor;
