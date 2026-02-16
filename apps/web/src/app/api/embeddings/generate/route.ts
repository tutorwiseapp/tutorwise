/**
 * Embedding Generation API Route
 *
 * Background job API to generate Gemini embeddings for listings, profiles, and organisations.
 * Stores embeddings as native pgvector format.
 *
 * POST /api/embeddings/generate
 * Body: { type: 'listings' | 'profiles' | 'organisations' | 'all', limit?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateEmbeddingForStorage,
  getListingEmbeddingText,
  getProfileEmbeddingText,
  getOrganisationEmbeddingText,
} from '@/lib/services/embeddings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { type = 'all', limit = 100 } = body;

    const results = {
      listings_processed: 0,
      listings_failed: 0,
      profiles_processed: 0,
      profiles_failed: 0,
      organisations_processed: 0,
      organisations_failed: 0,
      errors: [] as string[],
    };

    // Generate embeddings for listings
    if (type === 'listings' || type === 'all') {
      const { data: listings, error: fetchError } = await supabase
        .from('listings')
        .select('id, title, description, subjects, levels, specializations, delivery_mode, location_city')
        .eq('status', 'published')
        .is('embedding', null)
        .limit(limit);

      if (fetchError) {
        results.errors.push(`Failed to fetch listings: ${fetchError.message}`);
      } else if (listings) {
        for (const listing of listings) {
          try {
            const text = getListingEmbeddingText(listing);
            const embeddingLiteral = await generateEmbeddingForStorage(text);

            const { error: updateError } = await supabase
              .from('listings')
              .update({ embedding: embeddingLiteral })
              .eq('id', listing.id);

            if (updateError) {
              results.listings_failed++;
              results.errors.push(`Listing ${listing.id}: ${updateError.message}`);
            } else {
              results.listings_processed++;
            }
          } catch (error) {
            results.listings_failed++;
            results.errors.push(`Listing ${listing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Generate embeddings for profiles
    if (type === 'profiles' || type === 'all') {
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, bio, active_role')
        .eq('profile_completed', true)
        .is('embedding', null)
        .limit(limit);

      if (fetchError) {
        results.errors.push(`Failed to fetch profiles: ${fetchError.message}`);
      } else if (profiles) {
        for (const profile of profiles) {
          try {
            const text = getProfileEmbeddingText(profile);
            const embeddingLiteral = await generateEmbeddingForStorage(text);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({ embedding: embeddingLiteral })
              .eq('id', profile.id);

            if (updateError) {
              results.profiles_failed++;
              results.errors.push(`Profile ${profile.id}: ${updateError.message}`);
            } else {
              results.profiles_processed++;
            }
          } catch (error) {
            results.profiles_failed++;
            results.errors.push(`Profile ${profile.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Generate embeddings for organisations
    if (type === 'organisations' || type === 'all') {
      const { data: orgs, error: fetchError } = await supabase
        .from('connection_groups')
        .select('id, name, tagline, bio, subjects_offered, service_area, location_city, location_country')
        .eq('type', 'organisation')
        .eq('public_visible', true)
        .is('embedding', null)
        .limit(limit);

      if (fetchError) {
        results.errors.push(`Failed to fetch organisations: ${fetchError.message}`);
      } else if (orgs) {
        for (const org of orgs) {
          try {
            const text = getOrganisationEmbeddingText(org);
            const embeddingLiteral = await generateEmbeddingForStorage(text);

            const { error: updateError } = await supabase
              .from('connection_groups')
              .update({ embedding: embeddingLiteral })
              .eq('id', org.id);

            if (updateError) {
              results.organisations_failed++;
              results.errors.push(`Organisation ${org.id}: ${updateError.message}`);
            } else {
              results.organisations_processed++;
            }
          } catch (error) {
            results.organisations_failed++;
            results.errors.push(`Organisation ${org.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    }

    const totalProcessed = results.listings_processed + results.profiles_processed + results.organisations_processed;

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${totalProcessed} embeddings`,
    });
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate embeddings' },
      { status: 500 }
    );
  }
}
