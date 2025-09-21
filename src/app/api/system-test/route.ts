import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient();
  let supabaseStatus: 'ok' | 'error' = 'error';
  let neo4jStatus: 'ok' | 'error' = 'error';
  
  // --- Step 1: Write to Supabase ---
  try {
    const { error } = await supabase.from('system_test_logs').insert({ 
      source: 'Vercel Frontend', 
      status: 'initiated' 
    });
    if (error) throw error;
    supabaseStatus = 'ok';
  } catch (error) {
    console.error('Supabase write error:', error);
    // It's critical to return a JSON response even on failure
    return NextResponse.json({ 
        message: 'Failed to write to Supabase. Check table permissions and RLS policies.',
        supabase: 'error',
        neo4j: 'idle' // Neo4j test was not run
    }, { status: 500 });
  }

  // --- Step 2: Call Railway Backend to Write to Neo4j ---
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) throw new Error('CRITICAL: NEXT_PUBLIC_API_URL environment variable is not set on Vercel.');

    const response = await fetch(`${backendUrl}/test-neo4j-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Forward the specific error from the backend
      throw new Error(errorData.detail || 'The Railway backend returned an unspecified error.');
    }
    
    neo4jStatus = 'ok';
  } catch (error) {
    console.error('Railway/Neo4j error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while contacting the backend.';
    return NextResponse.json({ 
        message: errorMessage,
        supabase: supabaseStatus,
        neo4j: 'error'
    }, { status: 500 });
  }

  // --- Success ---
  return NextResponse.json({
    supabase: supabaseStatus,
    neo4j: neo4jStatus,
  });
}
