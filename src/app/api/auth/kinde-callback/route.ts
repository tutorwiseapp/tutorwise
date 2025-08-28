/*
 * Filename: src/app/api/auth/kinde-callback/route.ts
 * Purpose: Handles post-login synchronization between Kinde, Supabase, and Stripe.
 * Change History:
 * C002 - 2025-08-26 : 11:00 - Corrected to use the Kinde SDK's App Router pattern.
 * C001 - 2025-08-26 : 09:00 - Initial creation.
 * Last Modified: 2025-08-26 : 11:00
 * Requirement ID: VIN-AUTH-MIG-01
 * Change Summary: This is the definitive fix for the TypeScript errors. The code has been updated to use the correct Kinde SDK pattern for the Next.js App Router. It now calls `sessionManager()` without arguments to get the session helpers, and then uses `await getUser()` and `await isAuthenticated()` to retrieve the session details. This resolves the `NextRequest` type mismatch and the non-existent `getSession` property error.
 * Impact Analysis: This change makes the core user synchronization logic for the Kinde migration fully functional and type-safe.
 */
import { sessionManager } from "@/lib/kinde";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

// Initialize the Supabase Admin client, just like in the old webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const generateViniteAgentId = (firstName: string | null, lastName: string | null): string => {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : 'X';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : 'X';
    const initials = `${firstInitial}${lastInitial}`;
    const randomNumbers = Math.floor(100000 + Math.random() * 900000);
    return `A1-${initials}${randomNumbers}`;
};

export async function GET(req: NextRequest) {
  // --- THIS IS THE FIX: Use the correct Kinde SDK pattern for the App Router ---
  // The sessionManager (getKindeServerSession) is called without arguments.
  const { getUser, isAuthenticated } = sessionManager();
  const user = await getUser();
  const authenticated = await isAuthenticated();

  // If the user is not authenticated or the user object is missing, deny access.
  if (!authenticated || !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Check if the user already exists in our Supabase 'profiles' table
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id) // Use the user ID from the correctly fetched user object
    .single();

  // If no profile exists, this is a new user. We must synchronize them.
  if (!profile) {
    console.log(`[Kinde Callback] New user detected: ${user.id}. Synchronizing...`);

    // --- Use the 'user' object from 'getUser()' instead of 'session.user' ---
    const email = user.email;
    const firstName = user.given_name;
    const lastName = user.family_name;

    // 1. Create a Stripe Customer (idempotent "Find or Create" logic)
    let customerId: string;
    const customers = await stripe.customers.list({ email: email!, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: email!,
        name: `${firstName || ''} ${lastName || ''}`.trim(),
        metadata: { kindeId: user.id }
      });
      customerId = customer.id;
    }
    
    // 2. Generate a unique Vinite Agent ID
    const agent_id = generateViniteAgentId(firstName, lastName);
    
    // 3. Insert the new user profile into our Supabase database
    await supabaseAdmin.from('profiles').insert({
      id: user.id, // Kinde user ID
      agent_id: agent_id,
      email: email,
      display_name: `${firstName || ''} ${lastName || ''}`.trim() || email,
      first_name: firstName,
      last_name: lastName,
      custom_picture_url: user.picture,
      roles: ['agent'], // Default role
    });
  }

  // Redirect user to the dashboard after successful login/sync
  const dashboardUrl = new URL('/dashboard', process.env.KINDE_SITE_URL);
  return NextResponse.redirect(dashboardUrl);
}