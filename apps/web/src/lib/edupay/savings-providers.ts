/**
 * Filename: src/lib/edupay/savings-providers.ts
 * Purpose: Mock ISA/Savings provider data and interest calculation utilities
 * Created: 2026-02-11
 */

export type ProviderType = 'isa' | 'savings';

export interface SavingsProvider {
  id: string;
  name: string;
  type: ProviderType;
  interestRate: number; // Annual percentage (e.g., 5.1 = 5.1%)
  logoUrl: string;
  description: string;
  features: string[];
  minDeposit: number; // Minimum in GBP
  maxDeposit: number | null; // null = no max (ISA has £20k annual limit)
  isAvailable: boolean;
}

/**
 * Mock savings providers for simulation
 * Rates are representative of UK market as of Feb 2026
 */
export const SAVINGS_PROVIDERS: SavingsProvider[] = [
  // ISA Providers
  {
    id: 'moneybox_isa',
    name: 'Moneybox ISA',
    type: 'isa',
    interestRate: 5.1,
    logoUrl: '/images/providers/moneybox.svg',
    description: 'Tax-free stocks & shares ISA with round-up savings',
    features: ['Tax-free growth', 'Round-up savings', 'Easy withdrawals'],
    minDeposit: 1,
    maxDeposit: 20000, // ISA annual limit
    isAvailable: true,
  },
  {
    id: 'plum_isa',
    name: 'Plum ISA',
    type: 'isa',
    interestRate: 4.9,
    logoUrl: '/images/providers/plum.svg',
    description: 'AI-powered savings with automatic ISA top-ups',
    features: ['AI savings rules', 'Automatic top-ups', 'No fees'],
    minDeposit: 1,
    maxDeposit: 20000,
    isAvailable: true,
  },
  {
    id: 'nutmeg_isa',
    name: 'Nutmeg ISA',
    type: 'isa',
    interestRate: 4.7,
    logoUrl: '/images/providers/nutmeg.svg',
    description: 'Managed stocks & shares ISA with expert portfolios',
    features: ['Expert management', 'Multiple risk levels', 'Mobile app'],
    minDeposit: 100,
    maxDeposit: 20000,
    isAvailable: true,
  },
  // Savings Providers
  {
    id: 'chip_savings',
    name: 'Chip',
    type: 'savings',
    interestRate: 4.84,
    logoUrl: '/images/providers/chip.svg',
    description: 'Award-winning savings app with AI-powered auto-save',
    features: ['4.84% interest', 'Instant access', 'FSCS protected'],
    minDeposit: 1,
    maxDeposit: null,
    isAvailable: true,
  },
  {
    id: 'chase_saver',
    name: 'Chase Saver',
    type: 'savings',
    interestRate: 3.5,
    logoUrl: '/images/providers/chase.svg',
    description: 'Digital bank saver with no fees and instant access',
    features: ['No fees', 'Instant access', 'Cashback offers'],
    minDeposit: 1,
    maxDeposit: null,
    isAvailable: true,
  },
  {
    id: 'marcus_savings',
    name: 'Marcus by Goldman Sachs',
    type: 'savings',
    interestRate: 4.5,
    logoUrl: '/images/providers/marcus.svg',
    description: 'Online savings from Goldman Sachs with competitive rates',
    features: ['Competitive rates', 'Easy access', 'FSCS protected'],
    minDeposit: 1,
    maxDeposit: 250000,
    isAvailable: true,
  },
];

/**
 * Get providers by type
 */
export function getProvidersByType(type: ProviderType): SavingsProvider[] {
  return SAVINGS_PROVIDERS.filter(p => p.type === type && p.isAvailable);
}

/**
 * Get provider by ID
 */
export function getProviderById(id: string): SavingsProvider | undefined {
  return SAVINGS_PROVIDERS.find(p => p.id === id);
}

/**
 * Get best rate for a provider type
 */
export function getBestRate(type: ProviderType): number {
  const providers = getProvidersByType(type);
  return Math.max(...providers.map(p => p.interestRate));
}

/**
 * Calculate compound interest (monthly compounding)
 * @param principal - Initial amount in GBP
 * @param annualRate - Annual interest rate as percentage (e.g., 5.1)
 * @param months - Number of months
 * @returns Interest earned (not including principal)
 */
export function calculateInterest(
  principal: number,
  annualRate: number,
  months: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const finalAmount = principal * Math.pow(1 + monthlyRate, months);
  return Math.round((finalAmount - principal) * 100) / 100;
}

/**
 * Calculate total with interest
 */
export function calculateTotalWithInterest(
  principal: number,
  annualRate: number,
  months: number
): number {
  return principal + calculateInterest(principal, annualRate, months);
}

/**
 * Project savings growth over multiple time periods
 */
export interface SavingsProjection {
  months: number;
  label: string;
  interest: number;
  total: number;
}

export function projectSavingsGrowth(
  principal: number,
  annualRate: number
): SavingsProjection[] {
  const periods = [
    { months: 3, label: '3 months' },
    { months: 6, label: '6 months' },
    { months: 12, label: '1 year' },
    { months: 24, label: '2 years' },
  ];

  return periods.map(({ months, label }) => ({
    months,
    label,
    interest: calculateInterest(principal, annualRate, months),
    total: calculateTotalWithInterest(principal, annualRate, months),
  }));
}

/**
 * Compare direct loan payment vs save-then-pay strategy
 */
export interface StrategyComparison {
  directPayment: {
    amount: number;
    loanReduction: number;
  };
  saveThenPay: {
    savingsAfterMonths: number;
    interestEarned: number;
    totalAfterSaving: number;
    loanReduction: number;
    advantage: number;
  };
}

export function compareStrategies(
  gbpAmount: number,
  savingsRate: number,
  saveMonths: number = 12
): StrategyComparison {
  const interest = calculateInterest(gbpAmount, savingsRate, saveMonths);
  const totalAfterSaving = gbpAmount + interest;

  return {
    directPayment: {
      amount: gbpAmount,
      loanReduction: gbpAmount,
    },
    saveThenPay: {
      savingsAfterMonths: saveMonths,
      interestEarned: interest,
      totalAfterSaving,
      loanReduction: totalAfterSaving,
      advantage: interest,
    },
  };
}

/**
 * Format currency for display
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}
