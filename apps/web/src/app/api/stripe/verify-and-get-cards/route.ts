/*
 * Filename: src/app/api/stripe/verify-and-get-cards/route.ts
 * Purpose: Provides a secure endpoint to verify ownership and fetch payment methods.
 * Change History:
 * C003 - 2025-09-02 : 21:00 - Migrated to use Supabase server client for authentication.
 * Last Modified: 2025-09-02 : 21:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It uses the `createClient` to get the user and verifies ownership by checking the `supabaseId` in the Stripe customer's metadata.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { customerId } = await req.json();
    if (!customerId) {
      return new NextResponse(JSON.stringify({ error: "Customer ID is required" }), { status: 400 });
    }
    
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
        return new NextResponse(JSON.stringify({ error: "Customer not found." }), { status: 404 });
    }
    
    if (customer.metadata.supabaseId !== user.id) {
        console.warn(`[SECURITY] User ${user.id} attempted to access Stripe customer ${customerId} owned by ${customer.metadata.supabaseId}.`);
        return new NextResponse(JSON.stringify({ error: "Permission Denied" }), { status: 403 });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const savedCards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));
    
    return NextResponse.json({ 
        cards: savedCards,
        defaultPaymentMethodId: (customer as Stripe.Customer).invoice_settings?.default_payment_method 
    });
  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError ? `Stripe Error: ${error.message}` : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}