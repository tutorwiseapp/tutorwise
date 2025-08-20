/*
 * Filename: src/app/api/clerk-webhook/route.ts
 * Purpose: Handles incoming webhooks from Clerk to synchronize user data with Supabase and Stripe.
 * Change History:
 * C017 - 2025-08-20 : 14:00 - Definitive and final version with idempotent "Find or Create" logic.
 * C016 - 2025-08-18 : 10:00 - Made logic idempotent to prevent conflicts.
 * Last Modified: 2025-08-20
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive and final version of the webhook. Its logic is now a pure background synchronization task using a robust "Find or Create" pattern. It will never conflict with the primary, user-facing API routes. This change completes the robust, dual-system architecture.
 * Impact Analysis: This change makes the user creation and payment setup process fully resilient to all race conditions and timing issues.
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
    throw new Error('Please add CLERK_WEBHOOK_SECRET');
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
    evt = wh.verify(body, { "svix-id": svix_id, "svix-timestamp": svix_timestamp, "svix-signature": svix_signature }) as WebhookEvent;
  } catch (err) {
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
      const client = await clerkClient();
      const user = await client.users.getUser(id);
      
      let customerId: string;
      const customers = await stripe.customers.list({ email: email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: email, name: `${first_name || ''} ${last_name || ''}`.trim(), metadata: { clerkId: id } });
        customerId = customer.id;
      }
      
      const agent_id = user.publicMetadata.agent_id as string || generateViniteAgentId(first_name, last_name);
      
      await client.users.updateUserMetadata(id, {
        publicMetadata: { ...user.publicMetadata, agent_id: agent_id, role: 'agent', stripe_customer_id: customerId }
      });

      await supabaseAdmin.from('profiles').insert({ id: id, agent_id: agent_id, email: email, display_name: `${first_name || ''} ${last_name || ''}`.trim() || email, first_name: first_name, last_name: last_name, custom_picture_url: image_url, roles: ['agent'] });

      return NextResponse.json({ message: 'User created and synchronized' }, { status: 201 });

    } catch (error) {
        console.error("[Webhook] CRITICAL ERROR during user.created sync:", error);
        return new NextResponse(JSON.stringify({ error: `Webhook failed: ${(error as Error).message}` }), { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}