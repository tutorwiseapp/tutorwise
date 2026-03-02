/**
 * API Route Scanner — Process Discovery Engine
 *
 * Scans top-level API route domains in apps/web/src/app/api/.
 * Groups routes by business domain (bookings, listings, payments, etc.)
 * and builds a rawContent payload for AI analysis in Pass 2.
 *
 * Unstructured scanner (isStructured: false).
 * Pass 1 output: domain name, route list with HTTP methods, sample handler code.
 * Pass 2 (AI): infers the business workflow from grouped route patterns.
 */

import fs from 'fs/promises';
import path from 'path';
import type { SourceScanner, RawDiscovery } from '../types';

const API_DIR = path.join(process.cwd(), 'src/app/api');

// Domains to include, mapped to business metadata.
// Excluded: cron (handled by CronJobScanner), process-studio (internal tooling),
// auth (infra), admin (internal), webhooks (external triggers only).
const DOMAIN_CONFIGS: Record<string, { category: string; description: string }> = {
  bookings: {
    category: 'bookings',
    description:
      'API pipeline for booking creation, confirmation, scheduling negotiation, status transitions, cancellation, and payment collection',
  },
  listings: {
    category: 'listings',
    description:
      'API pipeline for tutor/agent listing creation, publication, update, and search indexing',
  },
  referrals: {
    category: 'referrals',
    description:
      'API pipeline for referral creation, tracking, conversion stage updates, and reward distribution',
  },
  reviews: {
    category: 'reviews',
    description:
      'API pipeline for review submission, moderation, and publication after session completion',
  },
  payments: {
    category: 'financials',
    description:
      'API pipeline for payment initiation, processing, reconciliation, and notification across EduPay and TrueLayer',
  },
  calendar: {
    category: 'bookings',
    description:
      'API pipeline for calendar provider connection, event sync, and availability management',
  },
  onboarding: {
    category: 'onboarding',
    description:
      'API pipeline for step-by-step user onboarding, profile completion, and verification',
  },
  profiles: {
    category: 'platform',
    description:
      'API pipeline for user profile reads, updates, CaaS score recalculation, and visibility management',
  },
  connections: {
    category: 'platform',
    description:
      'API pipeline for connection requests, acceptance, blocking, and relationship lifecycle management',
  },
};

// Max sample files to load per domain for rawContent (avoid token bloat)
const MAX_SAMPLE_FILES = 3;
// Max bytes per sample file
const MAX_SAMPLE_BYTES = 2_000;

// --- Route info ---

interface RouteInfo {
  path: string;
  filePath: string;
  methods: string[];
}

// --- Helpers ---

function humanize(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Recursively collect all route.ts files under a directory. */
async function collectRoutes(dir: string, routePrefix: string): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];

  let dirents: { name: string; isDirectory: () => boolean }[];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return routes;
  }

  for (const entry of dirents) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const sub = await collectRoutes(fullPath, `${routePrefix}/${entry.name}`);
      routes.push(...sub);
    } else if (entry.name === 'route.ts') {
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const methods = extractHttpMethods(content);
        const relPath = `apps/web/src${fullPath.split('/src')[1]}`;
        routes.push({ path: routePrefix, filePath: relPath, methods });
      } catch {
        // skip unreadable files
      }
    }
  }

  return routes;
}

/** Extract exported HTTP method handlers from a route file. */
function extractHttpMethods(content: string): string[] {
  const methods: string[] = [];
  for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(content)) {
      methods.push(m);
    }
  }
  return methods.length > 0 ? methods : ['GET'];
}

/** Load sample handler code from the first N route files (truncated). */
async function loadSampleCode(routes: RouteInfo[]): Promise<string> {
  const samples: string[] = [];
  for (const route of routes.slice(0, MAX_SAMPLE_FILES)) {
    try {
      // Reconstruct absolute path from relative apps/web path
      const absPath = path.join(
        process.cwd(),
        '../..',
        route.filePath
      );
      const content = await fs.readFile(absPath, 'utf-8');
      samples.push(`// ${route.path}\n${content.slice(0, MAX_SAMPLE_BYTES)}`);
    } catch {
      // skip
    }
  }
  return samples.join('\n\n---\n\n');
}

// --- Scanner ---

export class APIRouteScanner implements SourceScanner {
  sourceType = 'api_route' as const;
  isStructured = false;

  async scan(): Promise<RawDiscovery[]> {
    const discoveries: RawDiscovery[] = [];

    for (const [domain, config] of Object.entries(DOMAIN_CONFIGS)) {
      const domainDir = path.join(API_DIR, domain);

      try {
        const stat = await fs.stat(domainDir);
        if (!stat.isDirectory()) continue;
      } catch {
        continue;
      }

      const routes = await collectRoutes(domainDir, `/api/${domain}`);
      if (routes.length === 0) continue;

      // Build rawContent: structured route list + sample code
      const routeList = routes
        .map((r) => `${r.methods.join(', ')} ${r.path}`)
        .join('\n');
      const sampleCode = await loadSampleCode(routes);

      const rawContent = [
        `Domain: ${domain}`,
        `Routes (${routes.length} total):`,
        routeList,
        '',
        'Sample handler code:',
        sampleCode,
      ].join('\n');

      // Step names = route paths (top 8, deduplicated at first 2 segments)
      const stepNames = routes
        .map((r) => `${r.methods[0]} ${r.path}`)
        .slice(0, 8);

      discoveries.push({
        name: `${humanize(domain)} API Pipeline`,
        description: config.description,
        sourceType: 'api_route',
        sourceIdentifier: domain,
        sourceFilePaths: routes.map((r) => r.filePath),
        category: config.category,
        rawContent,
        confidence: 'low',
        confidenceReason: 'AI-inferred from grouped API route patterns',
        stepCount: routes.length,
        stepNames,
      });
    }

    return discoveries;
  }
}
