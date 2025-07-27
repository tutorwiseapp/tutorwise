/*
 * Filename: src/api/clerk-webhook/route.ts
 * Purpose: Handles incoming webhooks from Clerk, specifically for 'user.created' events.
 * Change History:
 * C010 - 2025-07-27 : 14:30 - Definitive fix for all TypeScript and SDK usage errors.
 * ... (previous history)
 * Last Modified: 2025-07-27 : 14:30
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive and final fix. It resolves the "Property 'users' does not exist"
 * error by correctly calling `clerkClient()` as a function and `await`ing the returned Promise to get
 * the SDK instance, precisely as required by the project's TypeScript configuration. The `email_address`
 * typo is also corrected.
 * Impact Analysis: Resolves all build errors, making the webhook fully functional and type-safe.
 * Dependencies: "svix", "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

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
    const { id, email_addresses, first_name, last_name } = evt.data;

    if (!id) {
      return new Response('Error: User ID is missing in the webhook payload.', { status: 400 });
    }

    const agent_id = generateViniteAgentId(first_name, last_name);

    const customer = await stripe.customers.create({
      email: email_addresses[0]?.email_address,
      name: `${first_name || ''} ${last_name || ''}`.trim(),
      metadata: {
        clerkId: id,
      }
    });
    
    // --- THIS IS THE SURGICAL FIX ---
    const client = await clerkClient();
    await client.users.updateUserMetadata(id, {
      publicMetadata: {
        agent_id: agent_id,
        role: 'agent',
        stripe_customer_id: customer.id,
      }
    });

    return NextResponse.json({ message: 'User metadata and Stripe customer created' }, { status: 200 });
  }

  return new Response('', { status: 200 });
}