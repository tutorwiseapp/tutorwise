/**
 * Lexi Provider API
 *
 * GET /api/lexi/provider - Get available providers and current selection
 * POST /api/lexi/provider - Change the active provider
 *
 * @module api/lexi/provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { lexiOrchestrator } from '@lexi/core/orchestrator';
import { providerFactory, getProviderInfo } from '@lexi/providers';
import type { LLMProviderType } from '@lexi/providers/types';

/**
 * GET /api/lexi/provider
 * Get available providers and current selection
 */
export async function GET(_request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get available providers
    const availableProviders = providerFactory.getAvailableProviders();
    const currentProvider = lexiOrchestrator.getProviderType();

    // Build provider list with info
    const providers = (['rules', 'claude', 'gemini'] as LLMProviderType[]).map(type => {
      const info = getProviderInfo(type);
      const isAvailable = availableProviders.includes(type);

      return {
        type,
        name: info.name,
        description: info.description,
        available: isAvailable,
        requiresApiKey: info.requiresApiKey,
        envVar: info.envVar,
        current: type === currentProvider,
      };
    });

    return NextResponse.json({
      current: currentProvider,
      currentName: lexiOrchestrator.getProviderName(),
      providers,
    });
  } catch (error) {
    console.error('[Lexi API] Provider GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lexi/provider
 * Change the active provider (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    // Only allow admins to change provider (or in development)
    const isAdmin = profile?.user_type === 'admin' || process.env.NODE_ENV === 'development';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { type } = body as { type: LLMProviderType };

    if (!type || !['rules', 'claude', 'gemini'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid provider type', code: 'INVALID_PROVIDER' },
        { status: 400 }
      );
    }

    // Check if provider is available
    const availableProviders = providerFactory.getAvailableProviders();
    if (!availableProviders.includes(type)) {
      const info = getProviderInfo(type);
      return NextResponse.json(
        {
          error: `Provider "${type}" is not available. ${info.requiresApiKey ? `Set ${info.envVar} to enable.` : ''}`,
          code: 'PROVIDER_UNAVAILABLE',
        },
        { status: 400 }
      );
    }

    // Change provider
    lexiOrchestrator.setProvider({ type });

    return NextResponse.json({
      success: true,
      current: lexiOrchestrator.getProviderType(),
      currentName: lexiOrchestrator.getProviderName(),
    });
  } catch (error) {
    console.error('[Lexi API] Provider POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
