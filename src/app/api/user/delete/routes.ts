// Filename: src/app/api/user/delete/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    // Initialize the Admin client with the service role key to perform the deletion
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Perform the deletion using the provided user ID
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Supabase user deletion error:', deleteError.message);
      return NextResponse.json({ error: `Database error: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User account has been permanently deleted.' });

  } catch (error) {
    console.error('Generic error in delete route:', error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}