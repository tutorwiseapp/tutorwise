/**
 * Filename: apps/web/src/app/api/embeddings/generate/route.ts
 * Purpose: Background job API to generate embeddings for listings and profiles
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Smart Search
 *
 * Usage:
 * POST /api/embeddings/generate
 * Body: { type: 'listings' | 'profiles' | 'all', limit?: number }
 *
 * This endpoint should be:
 * 1. Called manually after migration 112
 * 2. Set up as a cron job to backfill missing embeddings
 * 3. Called automatically when listings/profiles are created/updated (via triggers or API)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, getListingEmbeddingText, getProfileEmbeddingText } from '@/lib/services/embeddings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // Use service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { type = 'all', limit = 100 } = body;

    const results = {
      listings_processed: 0,
      listings_failed: 0,
      profiles_processed: 0,
      profiles_failed: 0,
      errors: [] as string[],
    };

    // Generate embeddings for listings
    if (type === 'listings' || type === 'all') {
      console.log(`Generating embeddings for listings (limit: ${limit})...`);

      // Fetch listings without embeddings
      const { data: listings, error: fetchError } = await supabase
        .from('listings')
        .select('id, title, description, subjects, levels, specializations, location_type, location_city')
        .eq('status', 'published')
        .is('embedding', null)
        .limit(limit);

      if (fetchError) {
        results.errors.push(`Failed to fetch listings: ${fetchError.message}`);
      } else if (listings) {
        console.log(`Found ${listings.length} listings needing embeddings`);

        for (const listing of listings) {
          try {
            // Generate embedding text
            const text = getListingEmbeddingText(listing);

            // Generate embedding vector
            const embedding = await generateEmbedding(text);

            // Update listing with embedding
            const { error: updateError } = await supabase
              .from('listings')
              .update({ embedding: JSON.stringify(embedding) })
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
      console.log(`Generating embeddings for profiles (limit: ${limit})...`);

      // Fetch profiles without embeddings that have tutors with published listings
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, bio, active_role')
        .is('embedding', null)
        .limit(limit);

      if (fetchError) {
        results.errors.push(`Failed to fetch profiles: ${fetchError.message}`);
      } else if (profiles) {
        console.log(`Found ${profiles.length} profiles needing embeddings`);

        for (const profile of profiles) {
          try {
            // Generate embedding text
            const text = getProfileEmbeddingText(profile);

            // Generate embedding vector
            const embedding = await generateEmbedding(text);

            // Update profile with embedding
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ embedding: JSON.stringify(embedding) })
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

    console.log('Embedding generation complete:', results);

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.listings_processed + results.profiles_processed} embeddings`,
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate embeddings',
      },
      { status: 500 }
    );
  }
}
