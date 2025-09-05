// Filename: src/app/api/user/delete/route.ts

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    // 1. Authenticate the user securely from their session cookie.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User not found.' }, { status: 401 });
    }
    
    // 2. Initialize the Admin client to perform the deletion.
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Perform the deletion using the authenticated user's ID.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      // If Supabase returns an error, forward it in a proper JSON response.
      console.error('Supabase user deletion error:', deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 4. On success, return a clear JSON response.
    return NextResponse.json({ success: true });

  } catch (e) {
    // 5. Catch any other unexpected errors and return a proper JSON response.
    const error = e as Error;
    console.error('Unhandled error in delete route:', error.message);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}