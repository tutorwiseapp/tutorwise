/**
 * Listing Embedding API Route
 *
 * Generates a Gemini embedding for a listing and stores it as a native pgvector.
 * Called fire-and-forget after publishing a listing.
 *
 * POST /api/listings/[id]/embed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateEmbeddingForStorage, getListingEmbeddingText } from '@/lib/services/embeddings';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceRoleClient();

    // Fetch listing data
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, title, description, subjects, levels, specializations, delivery_mode, location_city')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Generate embedding text and vector
    const text = getListingEmbeddingText(listing);
    if (!text.trim()) {
      return NextResponse.json({ error: 'Empty embedding text' }, { status: 400 });
    }

    const embeddingLiteral = await generateEmbeddingForStorage(text);

    // Store as native pgvector
    const { error: updateError } = await supabase
      .from('listings')
      .update({ embedding: embeddingLiteral })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to store listing embedding:', updateError);
      return NextResponse.json({ error: 'Failed to store embedding' }, { status: 500 });
    }

    return NextResponse.json({ success: true, listing_id: id });
  } catch (error) {
    console.error('Listing embed error:', error);
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}
