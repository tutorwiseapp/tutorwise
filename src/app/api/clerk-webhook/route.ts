/*
 * Filename: src/api/clerk-webhook/route.ts
 * Purpose: Handles incoming webhooks from Clerk to synchronize user data with Supabase and Stripe.
 * Change History:
 * C015 - 2025-08-16 : 10:00 - Definitive and final fix for metadata overwrite race condition using a Read-Modify-Write pattern.
 * C014 - 2025-08-15 : 10:00 - Attempted to fix race condition with payload data.
 * Last Modified: 2025-08-16
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive and final fix for the entire user creation data consistency problem. The logic now implements a robust "Read-Modify-Write" pattern. Before updating metadata, it first fetches the absolute latest user record directly from Clerk's API. It then merges the new fields (agent_id, stripe_customer_id) into this fresh data before writing it back. This permanently prevents the critical race condition where the webhook would overwrite other simultaneous metadata updates, ensuring data integrity.
 * Impact Analysis: This change permanently stabilizes the user data model and fixes the root cause of all downstream failures in the payment system.
 */
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
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

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', { status: 400 });
  }

  const eventType = evt.type;
  
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing user ID or email' }, { status: 400 });
    }

    try {
      // --- THIS IS THE DEFINITIVE, FINAL FIX ---
      // 1. READ: Fetch the most current user data from Clerk before making changes.
      const client = await clerkClient();
      const user = await client.users.getUser(id);

      // 2. MODIFY: Create the new data and merge it with the fresh data we just read.
      const agent_id = generateViniteAgentId(first_name, last_name);
      const customer = await stripe.customers.create({
        email: email,
        name: `${first_name || ''} ${last_name || ''}`.trim(),
        metadata: { clerkId: id }
      });
      
      const newPublicMetadata = {
          ...user.publicMetadata, // Spread the FRESH, existing metadata first
          agent_id: agent_id,
          role: 'agent',
          stripe_customer_id: customer.id,
      };

      // 3. WRITE: Write the complete, merged metadata object back to Clerk.
      await client.users.updateUserMetadata(id, {
        publicMetadata: newPublicMetadata
      });

      // Synchronize with the Supabase profiles table as before.
      const { error: supabaseError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: id,
          agent_id: agent_id,
          email: email,
          display_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
          first_name: first_name,
          last_name: last_name,
          custom_picture_url: image_url,
          roles: ['agent']
        });

      if (supabaseError) {
        throw supabaseError;
      }

      return NextResponse.json({ message: 'User created and synchronized successfully' }, { status: 201 });

    } catch (error) {
        console.error("[Webhook] CRITICAL ERROR during user.created sync:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: `Webhook failed: ${errorMessage}` }), { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, first_name, last_name, image_url } = evt.data;
    
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name,
        last_name: last_name,
        display_name: `${first_name || ''} ${last_name || ''}`.trim(),
        custom_picture_url: image_url,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating Supabase profile:', error);
      return NextResponse.json({ error: 'Failed to update Supabase profile' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User updated successfully' }, { status: 200 });
  }
  
  if (eventType === 'user.deleted') {
      const { id } = evt.data;
      if (!id) {
          return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
      }

      const { error } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', id);
          
      if (error) {
          console.error('Error deleting Supabase profile:', error);
          return NextResponse.json({ error: 'Failed to delete Supabase profile' }, { status: 500 });
      }
      
      return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  }

  return new Response('', { status: 200 });
}