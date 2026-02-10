/**
 * API endpoints for managing user API keys
 * GET - List user's API keys
 * POST - Generate new API key
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/developer/api-keys - List user's API keys
export async function GET(_request: Request) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get user's API keys (excluding sensitive hash)
  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select(
      `
      id,
      key_prefix,
      name,
      description,
      scopes,
      is_active,
      expires_at,
      last_used_at,
      total_requests,
      created_at,
      revoked_at
    `
    )
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    api_keys: apiKeys || [],
  });
}

// POST /api/developer/api-keys - Generate new API key
export async function POST(request: Request) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { name, description, scopes, expires_at } = body;

  // Validate required fields
  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: 'Name is required', field: 'name' },
      { status: 400 }
    );
  }

  // Validate scopes
  const validScopes = [
    'referrals:read',
    'referrals:write',
    'tutors:search',
    'caas:read',
    'profiles:read',
    'bookings:read',
  ];

  if (scopes && !Array.isArray(scopes)) {
    return NextResponse.json(
      { error: 'Scopes must be an array', field: 'scopes' },
      { status: 400 }
    );
  }

  if (scopes) {
    const invalidScopes = scopes.filter((s: string) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid scopes',
          invalid_scopes: invalidScopes,
          valid_scopes: validScopes,
        },
        { status: 400 }
      );
    }
  }

  // Call database function to generate API key
  const { data, error } = await supabase.rpc('generate_api_key', {
    p_profile_id: profile.id,
    p_name: name.trim(),
    p_description: description?.trim() || null,
    p_scopes: scopes || validScopes, // Default to all scopes if not specified
    p_expires_at: expires_at || null,
  });

  if (error) {
    console.error('Failed to generate API key:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status: 201 }
  );
}
