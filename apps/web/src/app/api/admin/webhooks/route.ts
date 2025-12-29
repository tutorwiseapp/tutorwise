/**
 * Filename: src/app/api/admin/webhooks/route.ts
 * Purpose: API endpoints for webhook CRUD operations
 * Created: 2025-12-29
 * Pattern: RESTful API with admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/webhooks
 * Create a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { url, events, status = 'active' } = body;

    // Validate required fields
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'URL and events array are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!url.match(/^https?:\/\//)) {
      return NextResponse.json(
        { error: 'URL must start with http:// or https://' },
        { status: 400 }
      );
    }

    // Insert webhook into database
    const { data: webhook, error: insertError } = await supabase
      .from('webhooks')
      .insert({
        url,
        events,
        status,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating webhook:', insertError);
      return NextResponse.json(
        { error: 'Failed to create webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error('Error in webhook POST:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/webhooks?id=<webhook_id>
 * Delete a webhook
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get webhook ID from query params
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Delete webhook from database
    const { error: deleteError } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (deleteError) {
      console.error('Error deleting webhook:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in webhook DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
