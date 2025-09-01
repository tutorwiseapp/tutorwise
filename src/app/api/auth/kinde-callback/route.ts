/*
 * Filename: src/app/api/auth/kinde-callback/route.ts
 * Purpose: Handles post-login synchronization between Kinde, Supabase, and Stripe.
 * Change History:
 * C003 - 2025-09-01 : 15:00 - Definitive fix to save stripe_customer_id to profiles table.
 * C002 - 2025-08-26 : 11:00 - Corrected to use the Kinde SDK's App Router pattern.
 * C001 - 2025-08-26 : 09:00 - Initial creation.
 * Last Modified: 2025-09-01 : 15:00
 * Requirement ID: VIN-AUTH-MIG-01
 * Change Summary: This is the definitive fix for the data synchronization logic. It now correctly saves the Stripe Customer ID to the new `stripe_customer_id` column in the `profiles` table upon user creation. This resolves the root cause of the "Permission Denied" error in the payments module.
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
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    console.log(`[Kinde Callback] New user detected: ${user.id}. Synchronizing...`);

    const email = user.email;
    const firstName = user.given_name;
    const lastName = user.family_name;

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
    
    const agent_id = generateViniteAgentId(firstName, lastName);
    
    // --- THIS IS THE CRITICAL FIX ---
    // We now save the stripe_customer_id along with all other profile data.
    await supabaseAdmin.from('profiles').insert({
      id: user.id,
      agent_id: agent_id,
      email: email,
      display_name: `${firstName || ''} ${lastName || ''}`.trim() || email,
      first_name: firstName,
      last_name: lastName,
      custom_picture_url: user.picture,
      roles: ['agent'],
      stripe_customer_id: customerId, // Save the Stripe Customer ID
    });
  }

  const dashboardUrl = new URL('/dashboard', process.env.KINDE_SITE_URL);
  return NextResponse.redirect(dashboardUrl);
}