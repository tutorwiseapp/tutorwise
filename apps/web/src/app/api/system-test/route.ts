import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST() {
  // --- Step 1: Pre-flight Check for Environment Variables ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ message: 'DIAGNOSTIC: A Supabase environment variable is MISSING on Vercel.' }, { status: 500 });
  }

  // --- Step 2: Write to Supabase using the base client ---
  // This creates a direct, simple client without cookie/SSR helpers.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  
  let supabaseStatus: 'ok' | 'error' = 'error';
  try {
    const { error } = await supabaseAdmin.from('system_test_logs').insert({ 
      source: 'Vercel Frontend', 
      status: 'initiated' 
    });
    if (error) throw error;
    supabaseStatus = 'ok';
  } catch (error) {
    console.error('Supabase write error:', error);
    const dbErrorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ 
        message: `Failed to write to Supabase. DB Error: ${dbErrorMessage}`,
        supabase: 'error',
        neo4j: 'idle' 
    }, { status: 500 });
  }

  // --- Step 3: Call Railway Backend to Write to Neo4j ---
  let neo4jStatus: 'ok' | 'error' = 'error';
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) throw new Error('CRITICAL: NEXT_PUBLIC_API_URL environment variable is not set on Vercel.');

    const response = await fetch(`${backendUrl}/test-neo4j-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
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
