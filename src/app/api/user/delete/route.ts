// Filename: src/app/api/user/delete/route.ts

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST() {
  console.log('[API DELETE USER]: Route handler started.');
  try {
    const supabase = createClient();
    console.log('[API DELETE USER]: Server client created.');
    
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

    if (getUserError) {
      console.error('[API DELETE USER]: Error getting user:', getUserError.message);
      return NextResponse.json({ error: `Auth error: ${getUserError.message}` }, { status: 500 });
    }

    if (!user) {
      console.warn('[API DELETE USER]: Unauthorized attempt. No user session found.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[API DELETE USER]: Authenticated user found: ${user.id}`);

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    console.log('[API DELETE USER]: Admin client created.');

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error(`[API DELETE USER]: Supabase admin delete error for user ${user.id}:`, deleteError.message);
      return NextResponse.json({ error: `Supabase error: ${deleteError.message}` }, { status: 500 });
    }

    console.log(`[API DELETE USER]: Successfully deleted user ${user.id}.`);
    return NextResponse.json({ success: true });

  } catch (e) {
    const error = e as Error;
    console.error('[API DELETE USER]: Unhandled exception in route handler:', error.message);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}