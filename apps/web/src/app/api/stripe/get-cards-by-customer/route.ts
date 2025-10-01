/*
 * Filename: src/app/api/stripe/get-cards-by-customer/route.ts
 * Purpose: Provides a secure endpoint to fetch payment methods for a specific Stripe Customer ID.
 * Change History:
 * C003 - 2025-09-04 : 15:00 - Enhanced to also return the default payment method ID.
 * C002 - 2025-09-02 : 20:00 - Migrated to use Supabase server client for authentication.
 * C001 - 2025-08-14 : 10:00 - Initial creation.
 * Last Modified: 2025-09-02 : 20:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It uses the `createClient` to authenticate the request before proceeding.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { customerId } = await req.json();
    if (!customerId) {
      return new NextResponse(JSON.stringify({ error: "Customer ID is required" }), { status: 400 });
    }
    
    // --- THIS IS THE FIX ---
    // Fetch both the payment methods and the customer details in parallel.
    const [paymentMethods, customer] = await Promise.all([
        stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
        stripe.customers.retrieve(customerId)
    ]);
    
    if (customer.deleted) {
        return new NextResponse(JSON.stringify({ error: "Customer not found." }), { status: 404 });
    }

    const savedCards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));
    
    // Return both the cards and the default payment method ID.
    return NextResponse.json({ 
        cards: savedCards,
        defaultPaymentMethodId: (customer as Stripe.Customer).invoice_settings?.default_payment_method 
    });

  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError ? `Stripe Error: ${error.message}` : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
