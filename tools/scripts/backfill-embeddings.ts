/**
 * Backfill Embeddings Script
 *
 * Generates Gemini text-embedding-004 (768-dim) embeddings for all
 * listings, profiles, and organisations that have NULL embeddings.
 *
 * Usage:
 *   npx tsx tools/scripts/backfill-embeddings.ts
 *   npx tsx tools/scripts/backfill-embeddings.ts --type=listings
 *   npx tsx tools/scripts/backfill-embeddings.ts --type=profiles
 *   npx tsx tools/scripts/backfill-embeddings.ts --type=organisations
 *   npx tsx tools/scripts/backfill-embeddings.ts --dry-run
 *
 * Requires: GOOGLE_AI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Config ---

const BATCH_SIZE = 50; // rows per batch
const RATE_LIMIT_DELAY_MS = 100; // delay between embedding calls to respect rate limits
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GOOGLE_KEY = process.env.GOOGLE_AI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!GOOGLE_KEY) {
  console.error('Missing GOOGLE_AI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const gemini = new GoogleGenerativeAI(GOOGLE_KEY);
const embeddingModel = gemini.getGenerativeModel({ model: 'gemini-embedding-001' });

// --- CLI Args ---

const args = process.argv.slice(2);
const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

// --- Embedding Text Generators ---

function getListingEmbeddingText(listing: any): string {
  return [
    listing.title || '',
    listing.description || '',
    `Subjects: ${listing.subjects?.join(', ') || ''}`,
    `Levels: ${listing.levels?.join(', ') || ''}`,
    `Specializations: ${listing.specializations?.join(', ') || ''}`,
    `Delivery: ${listing.delivery_mode?.join(', ') || ''}`,
    listing.location_city || '',
  ].filter(Boolean).join(' ');
}

function getProfileEmbeddingText(profile: any): string {
  return [
    profile.full_name || '',
    profile.bio || '',
    `Role: ${profile.active_role || ''}`,
  ].filter(Boolean).join(' ');
}

function getOrganisationEmbeddingText(org: any): string {
  return [
    org.name || '',
    org.tagline || '',
    org.bio || '',
    `Subjects: ${org.subjects_offered?.join(', ') || ''}`,
    `Service Area: ${org.service_area?.join(', ') || ''}`,
    `Location: ${org.location_city || ''}`,
    org.location_country || '',
  ].filter(Boolean).join(' ');
}

// --- Embedding Generation ---

async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text: truncated }] },
    outputDimensionality: 768,
  });
  return result.embedding.values;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Backfill Functions ---

async function backfillListings(): Promise<{ processed: number; errors: number }> {
  console.log('\n--- Backfilling Listings ---');
  let processed = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, description, subjects, levels, specializations, delivery_mode, location_city')
      .is('embedding', null)
      .eq('status', 'published')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching listings:', error.message);
      break;
    }

    if (!listings || listings.length === 0) break;

    console.log(`  Batch: ${listings.length} listings (offset ${offset})`);

    for (const listing of listings) {
      try {
        const text = getListingEmbeddingText(listing);
        if (!text.trim()) {
          console.log(`  Skip listing ${listing.id} — empty text`);
          continue;
        }

        if (dryRun) {
          console.log(`  [DRY RUN] Would embed listing ${listing.id}: "${text.slice(0, 80)}..."`);
          processed++;
          continue;
        }

        const embedding = await generateEmbedding(text);

        const { error: updateError } = await supabase
          .from('listings')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', listing.id);

        if (updateError) {
          console.error(`  Error updating listing ${listing.id}:`, updateError.message);
          errors++;
        } else {
          processed++;
          if (processed % 10 === 0) console.log(`  Processed ${processed} listings...`);
        }

        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (err) {
        console.error(`  Error embedding listing ${listing.id}:`, (err as Error).message);
        errors++;
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`  Listings done: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

async function backfillProfiles(): Promise<{ processed: number; errors: number }> {
  console.log('\n--- Backfilling Profiles ---');
  let processed = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, bio, active_role')
      .is('embedding', null)
      .eq('profile_completed', true)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching profiles:', error.message);
      break;
    }

    if (!profiles || profiles.length === 0) break;

    console.log(`  Batch: ${profiles.length} profiles (offset ${offset})`);

    for (const profile of profiles) {
      try {
        const text = getProfileEmbeddingText(profile);
        if (!text.trim()) {
          console.log(`  Skip profile ${profile.id} — empty text`);
          continue;
        }

        if (dryRun) {
          console.log(`  [DRY RUN] Would embed profile ${profile.id}: "${text.slice(0, 80)}..."`);
          processed++;
          continue;
        }

        const embedding = await generateEmbedding(text);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`  Error updating profile ${profile.id}:`, updateError.message);
          errors++;
        } else {
          processed++;
          if (processed % 10 === 0) console.log(`  Processed ${processed} profiles...`);
        }

        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (err) {
        console.error(`  Error embedding profile ${profile.id}:`, (err as Error).message);
        errors++;
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`  Profiles done: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

async function backfillOrganisations(): Promise<{ processed: number; errors: number }> {
  console.log('\n--- Backfilling Organisations ---');
  let processed = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    const { data: orgs, error } = await supabase
      .from('connection_groups')
      .select('id, name, tagline, bio, subjects_offered, service_area, location_city, location_country')
      .is('embedding', null)
      .eq('type', 'organisation')
      .eq('public_visible', true)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching organisations:', error.message);
      break;
    }

    if (!orgs || orgs.length === 0) break;

    console.log(`  Batch: ${orgs.length} organisations (offset ${offset})`);

    for (const org of orgs) {
      try {
        const text = getOrganisationEmbeddingText(org);
        if (!text.trim()) {
          console.log(`  Skip organisation ${org.id} — empty text`);
          continue;
        }

        if (dryRun) {
          console.log(`  [DRY RUN] Would embed organisation ${org.id}: "${text.slice(0, 80)}..."`);
          processed++;
          continue;
        }

        const embedding = await generateEmbedding(text);

        const { error: updateError } = await supabase
          .from('connection_groups')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', org.id);

        if (updateError) {
          console.error(`  Error updating organisation ${org.id}:`, updateError.message);
          errors++;
        } else {
          processed++;
          if (processed % 10 === 0) console.log(`  Processed ${processed} organisations...`);
        }

        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (err) {
        console.error(`  Error embedding organisation ${org.id}:`, (err as Error).message);
        errors++;
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`  Organisations done: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

// --- Main ---

async function main() {
  console.log('=== Embedding Backfill Script ===');
  console.log(`Provider: Gemini text-embedding-004 (768-dim)`);
  console.log(`Target: ${typeArg || 'all'}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Rate limit delay: ${RATE_LIMIT_DELAY_MS}ms`);

  const startTime = Date.now();
  const results: Record<string, { processed: number; errors: number }> = {};

  if (!typeArg || typeArg === 'listings') {
    results.listings = await backfillListings();
  }

  if (!typeArg || typeArg === 'profiles') {
    results.profiles = await backfillProfiles();
  }

  if (!typeArg || typeArg === 'organisations') {
    results.organisations = await backfillOrganisations();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Summary ===');
  for (const [type, result] of Object.entries(results)) {
    console.log(`  ${type}: ${result.processed} processed, ${result.errors} errors`);
  }
  console.log(`  Total time: ${elapsed}s`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
