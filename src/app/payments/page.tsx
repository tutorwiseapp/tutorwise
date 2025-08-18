/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C044 - 2025-08-12 : 16:00 - Definitive fix for saved cards not appearing after successful creation.
 * C043 - 2025-08-12 : 15:00 - Refactored to use the standard dashboard grid and card layout.
 * Last Modified: 2025-08-12 : 16:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the "card not displaying" bug. The component has been refactored to use `useSearchParams` to detect the `?status=success` query parameter upon redirect from Stripe. A new `useEffect` hook now explicitly triggers a data re-fetch and shows a success toast when this parameter is present, ensuring the new card appears immediately.
 * Impact Analysis: This change fixes a critical bug in the user flow for adding a new payment method, making the feature fully functional and reliable.
 */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import Link from 'next/link';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import SavedCardList from '@/app/components/ui/payments/SavedCardList';
import dashboardStyles from '@/app/dashboard/page.module.css';

interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
    exp_month: number | undefined;
    exp_year: number | undefined;
}

// The main logic is in this component to allow usage of useSearchParams
const PaymentsPageContent = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        // Don't set loading to true here if we are just refreshing in the background
        try {
            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account'),
                fetch('/api/stripe/get-payment-methods')
            ]);

            if (accountRes.ok) {
                const accountData = await accountRes.json();
                setStripeAccount(accountData.account);
            }
            if (cardsRes.ok) {
                const cardsData = await cardsRes.json();
                setSavedCards(cardsData.cards || []);
                setDefaultPaymentMethodId(cardsData.defaultPaymentMethodId);
            }
        } catch (error) {
            console.error('Failed to fetch payment data:', error);
            toast.error('Could not load your payment details.');
        } finally {
            setIsLoading(false); // Only set loading to false after the initial load
        }
    }, [user]);

    // Initial data load effect
    useEffect(() => {
        if (isLoaded) {
            if (user) {
                fetchData();
            } else {
                router.push('/sign-in');
            }
        }
    }, [isLoaded, user, router, fetchData]);

    // --- THIS IS THE DEFINITIVE FIX ---
    // This effect specifically handles the return from Stripe checkout
    useEffect(() => {
        const status = searchParams.get('status');
        if (status === 'success') {
            toast.success('Your new card was added successfully!');
            fetchData(); // Re-fetch the data to show the new card
            
            // Clean the URL to avoid re-triggering on refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams, fetchData]);

    const handleConnectStripe = async () => {
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const response = await fetch('/api/stripe/connect-account');
            if (!response.ok) throw new Error("Could not get a connection URL.");
            const { url } = await response.json();
            if (url) window.location.href = url; else toast.dismiss(toastId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to connect.', { id: toastId });
        }
    };

    const handleAddNewCard = async () => {
        const toastId = toast.loading('Redirecting...');
        try {
            const response = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to create session.');
            const { sessionId } = await response.json();
            const stripe = await getStripe();
            if (stripe && sessionId) await stripe.redirectToCheckout({ sessionId });
            else throw new Error("Stripe.js failed to load.");
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred.", { id: toastId });
        }
    };

    const handleSetDefault = async (paymentMethodId: string) => {
        const toastId = toast.loading('Setting default...');
        try {
            await fetch('/api/stripe/set-default-card', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId }) 
            });
            setDefaultPaymentMethodId(paymentMethodId);
            toast.success('Default card updated.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred.", { id: toastId });
        }
    };

    const handleRemove = async (paymentMethodId: string) => {
        if (!confirm('Are you sure you want to remove this card?')) return;
        const toastId = toast.loading('Removing card...');
        try {
            await fetch('/api/stripe/remove-card', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId }) 
            });
            setSavedCards(cards => cards.filter(c => c.id !== paymentMethodId));
            toast.success('Card removed.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred.", { id: toastId });
        }
    };

    if (!isLoaded || isLoading) {
        return <Container><PageHeader title="Payments" /><p className={dashboardStyles.loading}>Loading payment settings...</p></Container>;
    }
    
    return (
        <Container>
            <PageHeader title="Payments" subtitle="Manage your methods for sending and receiving payments." />
            
            <div className={dashboardStyles.grid}>
                <div className={dashboardStyles.gridCard}>
                    <SavedCardList
                        cards={savedCards}
                        onAddNew={handleAddNewCard}
                        onRemove={handleRemove}
                        onSetDefault={handleSetDefault}
                        defaultPaymentMethodId={defaultPaymentMethodId}
                    />
                </div>

                <div className={dashboardStyles.gridCard}>
                    <div className={dashboardStyles.cardContent}>
                        <h3>Receiving Payment Methods</h3>
                        <p>Connect a Stripe account to receive your referral earnings and payouts.</p>
                    </div>
                     <Link href="#" onClick={(e) => { e.preventDefault(); handleConnectStripe(); }} className={dashboardStyles.cardLink}>
                        {stripeAccount?.details_submitted ? 'Manage Stripe Account' : 'Connect with Stripe'}
                    </Link>
                </div>
            </div>
        </Container>
    );
}

// The parent component now wraps the main content in Suspense
const PaymentsPage = () => {
    return (
        <Suspense fallback={<Container><PageHeader title="Payments" /><p>Loading...</p></Container>}>
            <PaymentsPageContent />
        </Suspense>
    );
};

export default PaymentsPage;