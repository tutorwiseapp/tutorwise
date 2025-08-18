/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C047 - 2025-08-12 : 19:00 - Definitive fix for displaying specific backend errors on the frontend.
 * C046 - 2025-08-12 : 18:00 - Fixed card management actions with optimistic UI.
 * Last Modified: 2025-08-12 : 19:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the vague "Failed to create session" error. The `handleAddNewCard` function now properly awaits and parses the JSON body of a failed API response. This allows it to display the specific, meaningful error message sent from the backend (e.g., "Stripe Customer ID not found") instead of a generic one.
 * Impact Analysis: This change dramatically improves the debuggability and user experience of the payment features by providing clear, actionable error messages.
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
        try {
            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account', { cache: 'no-store' }),
                fetch('/api/stripe/get-payment-methods', { cache: 'no-store' })
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
            toast.error('Could not load your payment details.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isLoaded) {
            if (user) { fetchData(); } else { router.push('/sign-in'); }
        }
    }, [isLoaded, user, router, fetchData]);

    useEffect(() => {
        const status = searchParams.get('status');
        if (status === 'success') {
            toast.success('Your new card was added successfully!');
            fetchData();
            window.history.replaceState({}, '', window.location.pathname);
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
            
            // --- THIS IS THE DEFINITIVE FIX ---
            // If the response is not ok, we parse the JSON body to get the specific error.
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create session.');
            }

            const { sessionId } = await response.json();
            const stripe = await getStripe();
            if (stripe && sessionId) await stripe.redirectToCheckout({ sessionId });
            else throw new Error("Stripe.js failed to load.");
            toast.dismiss(toastId);
        } catch (error) {
            // The specific error from the backend will now be displayed here.
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
        }
    };

    const handleSetDefault = async (paymentMethodId: string) => {
        const toastId = toast.loading('Setting default...');
        try {
            const response = await fetch('/api/stripe/set-default-card', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId }) 
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to set default card.');
            }
            setDefaultPaymentMethodId(paymentMethodId);
            toast.success('Default card updated.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
        }
    };

    const handleRemove = async (paymentMethodId: string) => {
        if (!confirm('Are you sure you want to remove this card?')) return;
        const originalCards = [...savedCards];
        setSavedCards(cards => cards.filter(c => c.id !== paymentMethodId));
        const toastId = toast.loading('Removing card...');
        try {
            const response = await fetch('/api/stripe/remove-card', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId }) 
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to remove card.');
            }
            toast.success('Card removed successfully.', { id: toastId });
        } catch (error) {
            setSavedCards(originalCards);
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
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

const PaymentsPage = () => {
    return (
        <Suspense fallback={<Container><PageHeader title="Payments" /><p className={dashboardStyles.loading}>Loading...</p></Container>}>
            <PaymentsPageContent />
        </Suspense>
    );
};

export default PaymentsPage;