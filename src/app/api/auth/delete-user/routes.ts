/*
 * Filename: src/app/api/auth/delete-user/route.ts
 * Purpose: Provides a secure, server-side API endpoint for deleting a user.
 *
 * Change History:
 * C001 - 2025-07-22 : 15:00 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 15:00
 * Requirement ID (optional): VIN-A-006
 *
 * Change Summary:
 * Created a new API route that uses the Supabase Admin client to perform user deletion.
 * This is a critical security measure, as user deletion should only ever be performed on the
 * server with admin privileges, not on the client.
 *
 * Impact Analysis:
 * This provides the necessary backend functionality for the Delete Account page.
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  // Get the current authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // To delete a user, we must use the Supabase Admin client, which has elevated privileges.
  // This should NEVER be exposed on the client side.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // This is a secret key stored in Vercel
  );

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }

  // The onAuthStateChange listener in AuthProvider will handle the logout on the client.
  return NextResponse.json({ message: 'User deleted successfully.' });
}