/**
 * Filename: lib/api/financials.ts
 * Purpose: API functions for financials/transactions management
 * Created: 2025-11-13
 * Pattern: React Query compatible API layer
 */

import { Transaction } from '@/types';

export interface FinancialBalances {
  available: number;
  pending: number;
  total: number;
}

export interface FinancialsData {
  transactions: Transaction[];
  balances: FinancialBalances;
}

/**
 * Fetch transactions and balances
 */
export async function getFinancials(): Promise<FinancialsData> {
  const response = await fetch('/api/financials', {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch financial data');
  }

  const data = await response.json();

  return {
    transactions: data.transactions || [],
    balances: data.balances || { available: 0, pending: 0, total: 0 },
  };
}

/**
 * Fetch payout transactions (Withdrawals)
 */
export async function getPayouts(): Promise<FinancialsData> {
  const response = await fetch('/api/financials?type=Withdrawal', {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payouts');
  }

  const data = await response.json();

  return {
    transactions: data.transactions || [],
    balances: data.balances || { available: 0, pending: 0, total: 0 },
  };
}

/**
 * Fetch disputed transactions
 */
export async function getDisputes(): Promise<FinancialsData> {
  const response = await fetch('/api/financials?status=disputed', {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch disputes');
  }

  const data = await response.json();

  return {
    transactions: data.transactions || [],
    balances: data.balances || { available: 0, pending: 0, total: 0 },
  };
}
