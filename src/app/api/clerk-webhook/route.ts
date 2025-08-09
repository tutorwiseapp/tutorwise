/*
 * Filename: src/api/clerk-webhook/route.ts
 * Purpose: Handles incoming webhooks from Clerk to synchronize user data with the application's Supabase database.
 * Change History:
 * C011 - 2025-08-07 : 19:00 - Definitive fix for missing Agent ID and data synchronization.
 * C010 - 2025-07-27 : 14:30 - Definitive fix for all TypeScript and SDK usage errors.
 * C009 - 2025-07-27 : 14:30 - (Previous history)
 * Last Modified: 2025-08-07 : 19:00
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive fix for the missing Agent ID. The webhook has been completely rewritten to be robust and handle multiple event types. It now uses a Supabase Admin client to create, update, and delete records in the `profiles` table in direct response to `user.created`, `user.updated`, and `user.deleted` events from Clerk. This ensures perfect data synchronization and resolves the root cause of the bug.
 * Impact Analysis: This change fixes a critical bug preventing Agent IDs from appearing on the dashboard and profile pages. It makes the user data model robust and reliable.
 * Dependencies: "svix", "next/server", "@clerk/nextjs/server", "@supabase/supabase-js", "@/lib/stripe".
 */
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

// Create a Supabase admin client to bypass RLS for system-level operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to generate a unique Vinite Agent ID
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

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  // Verify the payload with the headers
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
  
  // --- HANDLE USER.CREATED EVENT ---
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing user ID or email' }, { status: 400 });
    }

    // 1. Generate the unique Vinite Agent ID
    const agent_id = generateViniteAgentId(first_name, last_name);

    // 2. Create a customer in Stripe for future payments
    const customer = await stripe.customers.create({
      email: email,
      name: `${first_name || ''} ${last_name || ''}`.trim(),
      metadata: { clerkId: id }
    });
    
    // 3. Update the user's public metadata in Clerk to store these new IDs
    const client = await clerkClient();
    await client.users.updateUserMetadata(id, {
      publicMetadata: {
        agent_id: agent_id,
        role: 'agent', // Assign 'agent' as the default role
        stripe_customer_id: customer.id,
      }
    });

    // 4. Create a corresponding profile in your Supabase 'profiles' table
    const { error: supabaseError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: id, // This is the Clerk User ID
        agent_id: agent_id,
        email: email,
        display_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
        first_name: first_name,
        last_name: last_name,
        custom_picture_url: image_url,
        roles: ['agent']
      });

    if (supabaseError) {
      console.error('Error creating Supabase profile:', supabaseError);
      return NextResponse.json({ error: 'Failed to create Supabase profile' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User created and synchronized successfully' }, { status: 201 });
  }

  // --- HANDLE USER.UPDATED EVENT ---
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
  
  // --- HANDLE USER.DELETED EVENT ---
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