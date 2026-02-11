/**
 * Filename: src/lib/api/edupay.ts
 * Purpose: EduPay API client functions
 * Created: 2026-02-10
 */

export interface EduPayWallet {
  user_id: string;
  total_ep: number;
  available_ep: number;
  pending_ep: number;
  converted_ep: number;
  updated_at: string;
}

export interface EduPayLedgerEntry {
  id: string;
  event_id: string | null;
  ep_amount: number;
  type: 'earn' | 'convert' | 'expire' | 'bonus';
  status: 'pending' | 'available' | 'processed';
  available_at: string | null;
  note: string | null;
  created_at: string;
  event_type?: string;
}

export interface EduPayProjection {
  years_earlier: number;
  interest_saved_gbp: number;
  projected_debt_free_date: string;
  monthly_ep_rate: number;
}

export interface EduPayLoanProfile {
  user_id: string;
  loan_plan: 'plan1' | 'plan2' | 'plan5' | 'postgrad';
  estimated_balance: number;
  annual_salary: number;
  graduation_year: number;
  slc_reference?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanProfileInput {
  loan_plan: 'plan1' | 'plan2' | 'plan5' | 'postgrad';
  estimated_balance: number;
  annual_salary: number;
  graduation_year: number;
  slc_reference?: string | null;
}

export interface ConversionInput {
  ep_amount: number;
  destination: 'student_loan' | 'isa' | 'savings';
}

export async function getEduPayWallet(): Promise<EduPayWallet | null> {
  const res = await fetch('/api/edupay/wallet');
  if (!res.ok) return null;
  const data = await res.json();
  return data.wallet ?? null;
}

export async function getEduPayLedger(): Promise<EduPayLedgerEntry[]> {
  const res = await fetch('/api/edupay/ledger');
  if (!res.ok) return [];
  const data = await res.json();
  return data.ledger ?? [];
}

export async function getEduPayProjection(): Promise<EduPayProjection | null> {
  const res = await fetch('/api/edupay/projection');
  if (!res.ok) return null;
  const data = await res.json();
  return data.projection ?? null;
}

export async function getLoanProfile(): Promise<EduPayLoanProfile | null> {
  const res = await fetch('/api/edupay/loan-profile');
  if (!res.ok) return null;
  const data = await res.json();
  return data.loanProfile ?? null;
}

export async function saveLoanProfile(data: LoanProfileInput): Promise<EduPayLoanProfile> {
  const res = await fetch('/api/edupay/loan-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save loan profile');
  const json = await res.json();
  return json.loanProfile;
}

export interface ConversionResponse {
  conversion_id: string;
  auth_url: string | null;
  stub: boolean;
  message?: string;
}

export async function requestConversion(data: ConversionInput): Promise<ConversionResponse> {
  const res = await fetch('/api/edupay/conversion/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to request conversion');
  }
  return res.json() as Promise<ConversionResponse>;
}

// ============================================================================
// Linked Accounts (ISA/Savings providers)
// ============================================================================

export interface LinkedAccount {
  id: string;
  user_id: string;
  provider_id: string;
  provider_name: string;
  provider_type: 'isa' | 'savings';
  provider_logo_url: string | null;
  account_name: string | null;
  account_last4: string | null;
  interest_rate: number;
  status: 'active' | 'disconnected';
  is_mock: boolean;
  connected_at: string;
}

export interface LinkAccountInput {
  provider_id: string;
  account_name?: string;
}

export async function getLinkedAccounts(): Promise<LinkedAccount[]> {
  const res = await fetch('/api/edupay/linked-accounts');
  if (!res.ok) return [];
  const data = await res.json();
  return data.accounts ?? [];
}

export async function linkAccount(data: LinkAccountInput): Promise<LinkedAccount> {
  const res = await fetch('/api/edupay/linked-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to link account');
  }
  const json = await res.json();
  return json.account;
}

export async function unlinkAccount(accountId: string): Promise<void> {
  const res = await fetch(`/api/edupay/linked-accounts/${accountId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to unlink account');
  }
}

// ============================================================================
// Savings Allocations
// ============================================================================

export interface SavingsAllocation {
  id: string;
  user_id: string;
  linked_account_id: string;
  linked_account?: LinkedAccount;
  ep_amount: number;
  gbp_amount: number;
  interest_rate_at_creation: number;
  projected_interest_12mo: number | null;
  status: 'allocated' | 'transferred' | 'withdrawn' | 'cancelled';
  created_at: string;
}

export interface SavingsSummary {
  total_gbp_allocated: number;
  total_projected_interest: number;
  total_with_interest: number;
  allocation_count: number;
}

export async function getSavingsAllocations(): Promise<SavingsAllocation[]> {
  const res = await fetch('/api/edupay/savings/allocations');
  if (!res.ok) return [];
  const data = await res.json();
  return data.allocations ?? [];
}

export async function getSavingsSummary(): Promise<SavingsSummary | null> {
  const res = await fetch('/api/edupay/savings/summary');
  if (!res.ok) return null;
  const data = await res.json();
  return data.summary ?? null;
}

export interface ConversionToSavingsInput {
  ep_amount: number;
  destination: 'isa' | 'savings';
  linked_account_id: string;
}

export interface ConversionToSavingsResponse {
  conversion_id: string;
  allocation_id: string;
  stub: boolean;
  message?: string;
}

export async function requestConversionToSavings(
  data: ConversionToSavingsInput
): Promise<ConversionToSavingsResponse> {
  const res = await fetch('/api/edupay/conversion/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to request conversion');
  }
  return res.json() as Promise<ConversionToSavingsResponse>;
}
