// Filename: src/app/api/user/delete/route.ts

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize the Admin client with the service role key to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Perform the deletion
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    // Explicitly handle any errors from the deletion process
    if (deleteError) {
      console.error('Supabase user deletion error:', deleteError.message);
      return NextResponse.json({ error: `Database error: ${deleteError.message}` }, { status: 500 });
    }

    // On success, return a valid JSON response
    return NextResponse.json({ success: true, message: 'User account has been permanently deleted.' });

  } catch (error) {
    console.error('Generic error in delete route:', error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}