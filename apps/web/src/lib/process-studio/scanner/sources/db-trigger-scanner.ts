/**
 * Database Trigger Scanner — Process Discovery Engine
 *
 * Discovers event-driven workflows from PostgreSQL triggers and functions.
 *
 * Pass 1:
 *   1. Query `information_schema.triggers` via Supabase service-role client
 *      to get the live trigger list (name, event, table).
 *   2. Scan `tools/database/migrations/*.sql` for the matching function bodies.
 *   3. Group triggers by business domain (bookings, platform, reviews, referrals, financials).
 *
 * Pass 2 (AI): Converts raw SQL trigger bodies into ProcessNode[]/ProcessEdge[] graphs.
 *
 * Unstructured scanner (isStructured: false).
 */

import fs from 'fs/promises';
import path from 'path';
import { createServiceRoleClient } from '@/utils/supabase/server';
import type { SourceScanner, RawDiscovery } from '../types';

// Migrations directory — relative to apps/web (process.cwd() = apps/web)
const MIGRATIONS_DIR = path.join(process.cwd(), '../../tools/database/migrations');

// Map trigger/table names to business domains
const TABLE_CATEGORY: Record<string, string> = {
  bookings: 'bookings',
  booking_reviews: 'reviews',
  profiles: 'platform',
  connections: 'platform',
  connection_groups: 'platform',
  reviews: 'reviews',
  referrals: 'referrals',
  referral_conversions: 'referrals',
  transactions: 'financials',
  payouts: 'financials',
  calendar_connections: 'bookings',
  calendar_events: 'bookings',
};

// Known trigger groups — used to produce meaningful grouped discoveries
// when information_schema query succeeds
const TRIGGER_GROUPS: Array<{
  name: string;
  description: string;
  category: string;
  tablePatterns: string[];
  functionPatterns: string[];
}> = [
  {
    name: 'Booking Event Triggers',
    description:
      'Database triggers that fire on booking state changes — auto-create reviews on completion, update CaaS scores, and notify downstream systems',
    category: 'bookings',
    tablePatterns: ['bookings'],
    functionPatterns: [
      'on_booking_completed',
      'trigger_queue_on_booking',
      'auto_complete_booking',
    ],
  },
  {
    name: 'CaaS Score Queue Triggers',
    description:
      'Database triggers that queue CaaS score recalculations when profiles, reviews, or connections change',
    category: 'platform',
    tablePatterns: ['profiles', 'connections', 'booking_reviews'],
    functionPatterns: [
      'trigger_queue_on_profile',
      'trigger_queue_on_new_review',
      'trigger_queue_on_profile_graph',
      'trigger_queue_on_integration',
    ],
  },
  {
    name: 'Referral Conversion Triggers',
    description:
      'Database triggers that advance referrals through conversion stages when referral and sign-up events occur',
    category: 'referrals',
    tablePatterns: ['referrals', 'referral_conversions'],
    functionPatterns: ['update_referral_conversion', 'referral_stage'],
  },
  {
    name: 'User Onboarding Triggers',
    description:
      'Database triggers that fire when new users are created — assign referral codes, create profile defaults, and initialise onboarding state',
    category: 'onboarding',
    tablePatterns: ['profiles', 'auth.users'],
    functionPatterns: ['handle_new_user', 'create_profile', 'init_onboarding'],
  },
  {
    name: 'Payment & Transaction Triggers',
    description:
      'Database triggers that update wallet balances, queue payouts, and maintain financial audit trails on transaction events',
    category: 'financials',
    tablePatterns: ['transactions', 'payouts', 'wallets'],
    functionPatterns: ['update_wallet', 'queue_payout', 'update_transaction'],
  },
];

interface LiveTrigger {
  trigger_name: string;
  event_manipulation: string;
  event_object_table: string;
  action_timing: string;
}

/** Query live triggers from information_schema (service-role only). */
async function fetchLiveTriggers(): Promise<LiveTrigger[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `,
  });

  if (error || !data) {
    // Fall back to empty — scanner will use migration files only
    console.warn('[DBTriggerScanner] Could not query information_schema:', error?.message);
    return [];
  }

  return data as LiveTrigger[];
}

/** Scan migration SQL files for functions matching any of the given name patterns. */
async function extractFunctionBodies(patterns: string[]): Promise<string> {
  let files: string[];
  try {
    files = await fs.readdir(MIGRATIONS_DIR);
  } catch {
    return '';
  }

  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
  const bodies: string[] = [];

  for (const file of sqlFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }

    const matchesPattern = patterns.some((p) =>
      content.toLowerCase().includes(p.toLowerCase())
    );
    if (!matchesPattern) continue;

    // Extract CREATE OR REPLACE FUNCTION blocks that match any pattern
    const funcRegex =
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+[\w.]*?([\w_]+)\s*\([^)]*\)[^$]*\$\$[\s\S]*?\$\$\s*LANGUAGE/gi;

    let match: RegExpExecArray | null;
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1] || '';
      if (patterns.some((p) => funcName.toLowerCase().includes(p.toLowerCase()))) {
        // Truncate each function body to 3 KB
        bodies.push(match[0].slice(0, 3_000));
        if (bodies.length >= 3) break;
      }
    }

    if (bodies.length >= 3) break;
  }

  return bodies.join('\n\n---\n\n');
}

/** Build the list of files that contributed to a trigger group. */
async function findMigrationFilesForGroup(patterns: string[]): Promise<string[]> {
  let files: string[];
  try {
    files = await fs.readdir(MIGRATIONS_DIR);
  } catch {
    return [];
  }

  const matched: string[] = [];
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      if (patterns.some((p) => content.toLowerCase().includes(p.toLowerCase()))) {
        matched.push(`tools/database/migrations/${file}`);
      }
    } catch {
      continue;
    }
    if (matched.length >= 5) break;
  }

  return matched;
}

export class DBTriggerScanner implements SourceScanner {
  sourceType = 'db_trigger' as const;
  isStructured = false;

  async scan(): Promise<RawDiscovery[]> {
    // Query live triggers (best effort — falls back to empty list on error)
    let liveTriggers: LiveTrigger[] = [];
    try {
      liveTriggers = await fetchLiveTriggers();
    } catch {
      // Non-fatal — proceed with migration-only discovery
    }

    const discoveries: RawDiscovery[] = [];

    for (const group of TRIGGER_GROUPS) {
      // Check if any live triggers match this group's table patterns
      const matchingTriggers = liveTriggers.filter((t) =>
        group.tablePatterns.some(
          (tp) =>
            t.event_object_table.includes(tp) ||
            t.trigger_name.toLowerCase().includes(tp.toLowerCase())
        )
      );

      // Extract function bodies from migration files
      const rawContent = await extractFunctionBodies(group.functionPatterns);

      // Skip group if no live triggers found AND no migration code found
      if (matchingTriggers.length === 0 && rawContent.trim().length === 0) {
        continue;
      }

      const sourceFilePaths = await findMigrationFilesForGroup(group.functionPatterns);

      // Build step names from live trigger events
      const stepNames =
        matchingTriggers.length > 0
          ? matchingTriggers.slice(0, 8).map(
              (t) =>
                `${t.action_timing} ${t.event_manipulation} on ${t.event_object_table}`
            )
          : group.functionPatterns.map((p) => p.replace(/_/g, ' '));

      const triggerSummary =
        matchingTriggers.length > 0
          ? `\n\nLive triggers (${matchingTriggers.length}):\n` +
            matchingTriggers
              .slice(0, 10)
              .map(
                (t) =>
                  `${t.action_timing} ${t.event_manipulation} ON ${t.event_object_table}: ${t.trigger_name}`
              )
              .join('\n')
          : '';

      const combinedRawContent = [
        `Trigger group: ${group.name}`,
        `Domain: ${group.category}`,
        triggerSummary,
        rawContent ? '\n\nFunction bodies:\n' + rawContent : '',
      ]
        .filter(Boolean)
        .join('\n');

      discoveries.push({
        name: group.name,
        description: group.description,
        sourceType: 'db_trigger',
        sourceIdentifier: group.name.toLowerCase().replace(/\s+/g, '-'),
        sourceFilePaths,
        category: group.category,
        rawContent: combinedRawContent,
        confidence: 'low',
        confidenceReason: 'AI-inferred from database trigger function bodies',
        stepCount: stepNames.length || 3,
        stepNames,
      });
    }

    return discoveries;
  }
}
