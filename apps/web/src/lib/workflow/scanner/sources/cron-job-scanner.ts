/**
 * Cron Job Scanner — Process Discovery Engine
 *
 * Scans cron job route handlers in apps/web/src/app/api/cron/.
 * Unstructured scanner (isStructured: false) — Pass 1 extracts metadata;
 * Pass 2 uses AI to convert handler code into a workflow graph.
 *
 * Pass 1 output: job name, description, raw handler code, heuristic step names.
 * Pass 2 (AI): converts rawContent into ProcessNode[]/ProcessEdge[].
 */

import fs from 'fs/promises';
import path from 'path';
import type { SourceScanner, RawDiscovery } from '../types';

const CRON_DIR = path.join(process.cwd(), 'src/app/api/cron');

// Business category per cron job directory name
const CRON_CATEGORIES: Record<string, string> = {
  'complete-sessions': 'bookings',
  'no-show-detection': 'bookings',
  'session-reminders': 'bookings',
  'weekly-reports': 'analytics',
  'expire-invitations': 'onboarding',
  'edupay-clear-pending': 'financials',
  'process-batch-payouts': 'financials',
  'process-pending-commissions': 'referrals',
  'seo-sync': 'platform',
  'cas-dspy-optimize': 'platform',
};

// Human-readable descriptions (derived from file header comments where available)
const CRON_DESCRIPTIONS: Record<string, string> = {
  'complete-sessions':
    'Hourly: auto-completes confirmed bookings after session end time, then triggers review email sequence',
  'no-show-detection':
    'Every 15 min: detects no-shows for sessions started >30 min ago, creates no-show reports and sends alerts',
  'session-reminders':
    'Multi-interval: sends reminder notifications 24h, 1h, and 15 min before each scheduled session',
  'weekly-reports':
    'Weekly Mon 8am: generates performance reports for tutors and agents',
  'expire-invitations':
    'Daily 3am: expires guardian invitation tokens that have not been accepted',
  'edupay-clear-pending':
    'Clears pending EduPay conversion requests that have stalled',
  'process-batch-payouts':
    'Processes batch payment payouts to tutors and agents',
  'process-pending-commissions':
    'Processes pending referral commissions and marks them as paid',
  'seo-sync':
    'Syncs SEO metadata with Google Search Console',
  'cas-dspy-optimize':
    'Runs CAS DSPy optimisation to improve multi-agent prompt performance',
};

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Extract likely step names from cron handler code using comment heuristics.
 * Prefers numbered step comments; falls back to console.log bracket labels.
 */
function extractStepNames(content: string): string[] {
  const steps: string[] = [];

  // Pattern 1: numbered step comments — "// Step 1: ..." or "// 1. ..."
  for (const m of content.matchAll(/\/\/\s*(?:Step\s*)?\d+[.:]\s*(.+)/gi)) {
    const label = m[1].trim().replace(/['"]/g, '').slice(0, 60);
    if (label.length > 3) steps.push(label);
  }

  if (steps.length > 0) return steps.slice(0, 8);

  // Pattern 2: console.log bracket labels — "[Session Completion]"
  const seen = new Set<string>();
  for (const m of content.matchAll(/console\.log\(['"`]\[([^\]]+)\][^'"`]*['"`]/g)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      steps.push(m[1]);
    }
  }

  if (steps.length > 0) return steps.slice(0, 8);

  // Fallback: count try/catch blocks as a proxy for discrete steps
  const tryCount = (content.match(/\btry\s*\{/g) || []).length;
  for (let i = 1; i <= Math.min(tryCount, 5); i++) {
    steps.push(`Step ${i}`);
  }

  return steps.slice(0, 8);
}

export class CronJobScanner implements SourceScanner {
  sourceType = 'cron_job' as const;
  isStructured = false;

  async scan(): Promise<RawDiscovery[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(CRON_DIR);
    } catch {
      return [];
    }

    const discoveries: RawDiscovery[] = [];

    for (const entry of entries) {
      const routePath = path.join(CRON_DIR, entry, 'route.ts');

      try {
        const stat = await fs.stat(routePath);
        if (!stat.isFile()) continue;
      } catch {
        continue;
      }

      let content: string;
      try {
        content = await fs.readFile(routePath, 'utf-8');
      } catch {
        continue;
      }

      const category = CRON_CATEGORIES[entry] || 'platform';
      const description =
        CRON_DESCRIPTIONS[entry] ||
        `Scheduled automated job: ${humanize(entry)}`;
      const stepNames = extractStepNames(content);
      const relPath = `apps/web/src/app/api/cron/${entry}/route.ts`;

      discoveries.push({
        name: humanize(entry),
        description,
        sourceType: 'cron_job',
        sourceIdentifier: entry,
        sourceFilePaths: [relPath],
        category,
        rawContent: content,
        confidence: 'medium',
        confidenceReason: 'AI-analysed from cron job handler code',
        stepCount: stepNames.length || 3,
        stepNames,
      });
    }

    return discoveries;
  }
}
