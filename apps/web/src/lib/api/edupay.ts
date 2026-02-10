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
  created_at: string;
  updated_at: string;
}

export interface LoanProfileInput {
  loan_plan: 'plan1' | 'plan2' | 'plan5' | 'postgrad';
  estimated_balance: number;
  annual_salary: number;
  graduation_year: number;
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

export async function requestConversion(data: ConversionInput): Promise<void> {
  const res = await fetch('/api/edupay/conversion/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to request conversion');
}
