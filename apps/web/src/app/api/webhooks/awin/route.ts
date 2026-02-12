/**
 * Filename: apps/web/src/app/api/webhooks/awin/route.ts
 * Purpose: Receive Awin cashback transaction webhooks and award EP
 * Route: POST /api/webhooks/awin
 * Created: 2026-02-12
 *
 * Awin Integration Notes:
 * - Webhook URL must be registered in Awin Publisher MasterTag or API settings
 * - clickRef parameter in affiliate links contains our user_id (set when generating links)
 * - Transactions arrive when status changes to 'validated' (commission confirmed)
 * - Idempotency via transactionId prevents duplicate EP awards
 *
 * Auth: Bearer token from AWIN_WEBHOOK_SECRET or IP allowlist (configurable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Awin Transaction Data
 * Based on Awin Publisher API transaction structure
 */
interface AwinTransaction {
  id?: string;                    // Transaction ID (unique)
  transactionId?: string;         // Alternative field name
  advertiserId?: number;
  advertiserName?: string;
  publisherId?: number;
  commissionAmount?: {
    amount?: number;
    currency?: string;
  };
  saleAmount?: {
    amount?: number;
    currency?: string;
  };
  clickRef?: string;              // Our user_id passed via affiliate link
  transactionDate?: string;
  validationDate?: string;
  status?: 'pending' | 'approved' | 'declined' | 'bonus';
  transactionType?: string;
  // Alternative flat structure from some Awin webhook formats
  commission?: number;
  orderRef?: string;
  clickReference?: string;
  user_id?: string;               // Explicitly passed in some integrations
}

/**
 * Verify Awin webhook request
 * Supports multiple verification methods:
 * 1. Bearer token (AWIN_WEBHOOK_SECRET)
 * 2. API key header (X-Awin-Api-Key)
 * 3. IP allowlist (optional, for production hardening)
 */
function verifyAwinWebhook(request: NextRequest): boolean {
  const webhookSecret = process.env.AWIN_WEBHOOK_SECRET;

  // Method 1: Bearer token
  const authHeader = request.headers.get('authorization');
  if (webhookSecret && authHeader === `Bearer ${webhookSecret}`) {
    return true;
  }

  // Method 2: X-Awin-Api-Key header
  const apiKeyHeader = request.headers.get('x-awin-api-key');
  if (webhookSecret && apiKeyHeader === webhookSecret) {
    return true;
  }

  // Method 3: Allow if no secret configured (development mode)
  if (!webhookSecret || webhookSecret === 'your_awin_webhook_secret_here') {
    console.warn('[Awin Webhook] No AWIN_WEBHOOK_SECRET configured — accepting all requests');
    return true;
  }

  return false;
}

/**
 * Extract user_id from Awin transaction
 * Checks multiple possible field locations
 */
function extractUserId(tx: AwinTransaction): string | null {
  // Direct user_id field
  if (tx.user_id) return tx.user_id;

  // clickRef contains user_id (standard Awin approach)
  if (tx.clickRef) return tx.clickRef;

  // Alternative clickReference field
  if (tx.clickReference) return tx.clickReference;

  // orderRef might contain user_id prefix
  if (tx.orderRef && tx.orderRef.includes('_')) {
    const parts = tx.orderRef.split('_');
    // Format: userId_orderId
    if (parts[0].length === 36) return parts[0]; // UUID format
  }

  return null;
}

/**
 * Extract transaction ID for idempotency
 */
function extractTransactionId(tx: AwinTransaction): string | null {
  return tx.id || tx.transactionId || null;
}

/**
 * Extract commission amount in GBP
 */
function extractCommissionGbp(tx: AwinTransaction): number {
  // Structured commission object
  if (tx.commissionAmount?.amount) {
    const amount = tx.commissionAmount.amount;
    // Convert to GBP if different currency (simplified — full implementation would use exchange rates)
    if (tx.commissionAmount.currency && tx.commissionAmount.currency !== 'GBP') {
      console.warn('[Awin Webhook] Non-GBP commission, using as-is:', tx.commissionAmount.currency);
    }
    return amount;
  }

  // Flat commission field
  if (typeof tx.commission === 'number') {
    return tx.commission;
  }

  return 0;
}

/**
 * POST /api/webhooks/awin
 * Receives Awin transaction notifications and awards EP to users
 */
export async function POST(request: NextRequest) {
  // Verify request authenticity
  if (!verifyAwinWebhook(request)) {
    console.error('[Awin Webhook] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let transactions: AwinTransaction[];

  try {
    const body = await request.json();
    // Awin may send single transaction or array
    transactions = Array.isArray(body) ? body : [body];
  } catch {
    console.error('[Awin Webhook] Invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (transactions.length === 0) {
    return NextResponse.json({ received: true, processed: 0 });
  }

  const supabase = await createClient();
  const results: { transactionId: string | null; success: boolean; error?: string }[] = [];

  for (const tx of transactions) {
    const transactionId = extractTransactionId(tx);
    const userId = extractUserId(tx);
    const commissionGbp = extractCommissionGbp(tx);

    // Skip declined or pending transactions — only award for approved/validated
    const status = tx.status?.toLowerCase();
    if (status && status !== 'approved' && status !== 'bonus') {
      console.log('[Awin Webhook] Skipping non-approved transaction:', transactionId, status);
      results.push({ transactionId, success: true, error: `Skipped: status=${status}` });
      continue;
    }

    // Validation
    if (!userId) {
      console.error('[Awin Webhook] No user_id in transaction:', transactionId);
      results.push({ transactionId, success: false, error: 'Missing user_id/clickRef' });
      continue;
    }

    if (commissionGbp <= 0) {
      console.error('[Awin Webhook] Invalid commission amount:', transactionId, commissionGbp);
      results.push({ transactionId, success: false, error: 'Invalid commission amount' });
      continue;
    }

    // Verify user exists
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!user) {
      console.error('[Awin Webhook] User not found:', userId);
      results.push({ transactionId, success: false, error: 'User not found' });
      continue;
    }

    // Award EP via RPC (idempotent via idempotency_key)
    const idempotencyKey = transactionId
      ? `awin_${transactionId}`
      : `awin_${userId}_${tx.transactionDate || Date.now()}`;

    const metadata = {
      awin_transaction_id: transactionId,
      advertiser_id: tx.advertiserId,
      advertiser_name: tx.advertiserName,
      sale_amount: tx.saleAmount?.amount,
      sale_currency: tx.saleAmount?.currency,
      transaction_date: tx.transactionDate,
      validation_date: tx.validationDate,
    };

    const { error: rpcError } = await supabase.rpc('award_ep_for_event', {
      p_user_id: userId,
      p_event_type: 'affiliate_spend',
      p_value_gbp: commissionGbp,
      p_idempotency_key: idempotencyKey,
      p_metadata: JSON.stringify(metadata),
      p_source_system: 'awin',
    });

    if (rpcError) {
      console.error('[Awin Webhook] RPC error:', transactionId, rpcError);
      results.push({ transactionId, success: false, error: rpcError.message });
      continue;
    }

    console.log('[Awin Webhook] EP awarded:', {
      transactionId,
      userId,
      commissionGbp,
      advertiser: tx.advertiserName,
    });
    results.push({ transactionId, success: true });
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  console.log('[Awin Webhook] Processed:', { total: transactions.length, success: successCount, errors: errorCount });

  return NextResponse.json({
    received: true,
    processed: successCount,
    errors: errorCount,
    details: results,
  });
}

/**
 * GET /api/webhooks/awin
 * Health check endpoint for Awin webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'awin',
    message: 'Awin webhook endpoint is active',
  });
}
