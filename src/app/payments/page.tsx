/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C041 - 2025-08-11 : 10:00 - Refactored to use SavedCardList component and hardened create card flow.
 * C040 - 2025-08-10 : 23:00 - Definitive and final complete code implementation.
 * C039 - 2025-08-10 : 22:00 - Definitive fix for UI text and layout.
 * C038 - 2025-08-10 : 21:00 - Definitive fix for "Saved Cards" UI layout and styling.
 * Last Modified: 2025-08-11 : 10:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the payment card creation flow. The logic to display the list of saved cards has been moved into the dedicated SavedCardList component, cleaning up this file. The handleAddNewCard function now has more robust error handling to catch non-JSON responses from the server, providing better user feedback if the Stripe redirect fails to initiate.
 * Impact Analysis: This change improves the reliability of the "Add New Card" feature and makes the code more maintainable by properly encapsulating the card list UI.
 * Dependencies: "@clerk/nextjs", "@/lib/utils/get-stripejs", "react-hot-toast", and VDL UI components including the new SavedCardList.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import SavedCardList from '@/app/components/ui/payments/SavedCardList';
import styles from './page.module.css';

interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
    exp_month: number | undefined;
    exp_year: number | undefined;
}

const PaymentsPage = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account'),
                fetch('/api/stripe/get-payment-methods')
            ]);

            if (accountRes.ok) {
                const accountData = await accountRes.json();
                setStripeAccount(accountData.account);
            } else {
                console.warn('Could not fetch Stripe account:', accountRes.status);
            }

            if (cardsRes.ok) {
                const cardsData = await cardsRes.json();
                setSavedCards(cardsData.cards || []);
                setDefaultPaymentMethodId(cardsData.defaultPaymentMethodId);
            } else {
                console.warn('Could not fetch saved cards:', cardsRes.status);
            }
        } catch (error) {
            console.error('Failed to fetch payment data:', error);
            toast.error('Could not load your payment details.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isLoaded) {
            if (user) {
                fetchData();
            } else {
                router.push('/sign-in');
            }
        }
    }, [isLoaded, user, router, fetchData]);

    const handleConnectStripe = async () => {
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const response = await fetch('/api/stripe/connect-account');
            if (!response.ok) throw new Error("Could not get a connection URL.");
            const { url } = await response.json();
            if (url) window.location.href = url;
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to connect to Stripe.', { id: toastId });
        }
    };
    
    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your Stripe account? This cannot be undone.')) return;
        const toastId = toast.loading('Disconnecting Stripe account...');
        try {
            await fetch('/api/stripe/disconnect-account', { method: 'POST' });
            await user?.reload();
            await fetchData();
            toast.success('Stripe account disconnected.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', { id: toastId });
        }
    };

    const handleAddNewCard = async () => {
        const toastId = toast.loading('Redirecting to add card...');
        try {
            const response = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
            
            // --- THIS IS THE FIX: More robust error handling ---
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || 'Failed to create session.');
                } catch (e) {
                    throw new Error(`Server returned an error: ${response.status}`);
                }
            }

            const { sessionId } = await response.json();
            const stripe = await getStripe();
            if (stripe && sessionId) {
                await stripe.redirectToCheckout({ sessionId });
            } else {
                throw new Error("Stripe.js failed to load.");
            }
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
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
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
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
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
        }
    };

    if (!isLoaded || isLoading) {
        return <Container><PageHeader title="Payments" /><p>Loading payment settings...</p></Container>;
    }
    
    return (
        <Container>
            <PageHeader title="Payments" />
            
            <div className={styles.grid}>
                <Card>
                    <SavedCardList
                        cards={savedCards}
                        onAddNew={handleAddNewCard}
                        onRemove={handleRemove}
                        onSetDefault={handleSetDefault}
                        defaultPaymentMethodId={defaultPaymentMethodId}
                    />
                </Card>

                 <div className={styles.cardContainer}>
                    <Card>
                        <h3 className={styles.cardTitle}>Receiving Payment Methods</h3>
                        <p className={styles.cardDescription}>Connect a Stripe account to receive your referral earnings and payouts.</p>
                        {stripeAccount?.details_submitted ? (
                            <div className={styles.cardActions}>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleConnectStripe(); }} className={styles.cardLink}>Manage</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleDisconnect(); }} className={`${styles.cardLink} ${styles.disconnect}`}>Disconnect</a>
                            </div>
                        ) : (
                            <a href="#" onClick={(e) => { e.preventDefault(); handleConnectStripe(); }} className={styles.cardLink}>Connect with Stripe</a>
                        )}
                    </Card>
                    <p className={styles.footerText}>Your payment details are securely processed by Stripe. We do not retain your payment data.</p>
                </div>
            </div>
        </Container>
    );
};

export default PaymentsPage;