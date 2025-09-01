/*
 * Filename: src/app/api/auth/kinde-callback/route.ts
 * Purpose: Handles post-login synchronization between Kinde, Supabase, and Stripe.
 * Change History:
 * C001 - 2025-09-01 : 15:00 - Initial creation.
 * Last Modified: 2025-09-01 : 15:00
 * Requirement ID: VIN-APP-01
 * Change Summary: This is the definitive fix for the "Loading..." and missing Agent ID issues. This route runs immediately after a user logs in. It performs a critical "find or create" operation, ensuring that every authenticated Kinde user has a corresponding record in our Supabase `profiles` table, complete with a unique Vinite Agent ID and a Stripe Customer ID. This makes the user's full profile available to the UserProfileContext, resolving the root cause of the data-fetching failures.
 * Impact Analysis: This is a critical, additive change that makes the application functional for both new and returning users.
 */
import { sessionManager } from "@/lib/kinde";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

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
  const { getUser, isAuthenticated } = sessionManager();
  const user = await getUser();
  const authenticated = await isAuthenticated();

  if (!authenticated || !user) {
    // This should not happen in a real callback, but it's good practice.
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 1. Check if the user already exists in our database.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  // 2. If they do NOT exist, create them.
  if (!profile) {
    console.log(`[Kinde Callback] New user detected: ${user.id}. Synchronizing...`);

    const email = user.email;
    const firstName = user.given_name;
    const lastName = user.family_name;

    // Find or Create their Stripe Customer account.
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
    
    // Generate their unique Vinite Agent ID.
    const agent_id = generateViniteAgentId(firstName, lastName);
    
    // Insert the complete profile into our database.
    await supabaseAdmin.from('profiles').insert({
      id: user.id,
      agent_id: agent_id,
      email: email,
      display_name: `${firstName || ''} ${lastName || ''}`.trim() || email,
      first_name: firstName,
      last_name: lastName,
      custom_picture_url: user.picture,
      roles: ['agent'],
      stripe_customer_id: customerId,
    });
  }

  // 3. Redirect to the dashboard.
  // The UserProfileContext will now successfully fetch the data we just created.
  const dashboardUrl = new URL('/dashboard', process.env.KINDE_SITE_URL);
  return NextResponse.redirect(dashboardUrl);
}