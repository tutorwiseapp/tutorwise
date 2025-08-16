/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C023 - 2025-08-10 : 01:00 - Definitive fix: Added Stripe Disconnect functionality to this page.
 * C022 - 2025-08-09 : 22:00 - Definitive fix for misleading "Could not fetch saved cards" error.
 * C021 - 2025-08-09 : 19:00 - Final clean-up and state handling.
 * Last Modified: 2025-08-10 : 01:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive and final version. The "Disconnect Stripe Account" functionality has been correctly added to this page, appearing only when an account is connected. The associated API call and state updates are now handled here, providing the complete, correct user journey.
 * Impact Analysis: This change brings the payments page to a feature-complete and production-ready state.
 * Dependencies: "@clerk/nextjs", "@/lib/utils/get-stripejs", "react-hot-toast", and VDL UI components.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
}

const PaymentsPage = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    
    const [loadingConnect, setLoadingConnect] = useState(true);
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [loadingCards, setLoadingCards] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoaded && !user) {
            router.push('/sign-in');
            return;
        }
        if (user) {
            fetchAccountStatus();
            fetchSavedCards();
        }
    }, [isLoaded, user, router]);

    async function fetchAccountStatus() {
        setLoadingConnect(true);
        try {
            const response = await fetch('/api/stripe/get-connect-account');
            if (!response.ok) throw new Error('Failed to get Stripe status.');
            const data = await response.json();
            setStripeAccount(data.account);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not get Stripe status.");
        } finally {
            setLoadingConnect(false);
        }
    }

    async function fetchSavedCards() {
        setLoadingCards(true);
        setFetchError(null);
        try {
            const response = await fetch('/api/stripe/get-payment-methods');
            if (!response.ok) {
                throw new Error('Could not fetch saved cards.');
            }
            const data: SavedCard[] = await response.json();
            setSavedCards(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setFetchError(errorMessage);
        } finally {
            setLoadingCards(false);
        }
    }

    const handleConnectStripe = async () => {
        setLoadingConnect(true);
        try {
            const response = await fetch('/api/stripe/connect-account');
            if (!response.ok) throw new Error("Could not get a connection URL.");
            const { url } = await response.json();
            if (url) window.location.href = url;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to connect to Stripe.');
        } finally {
            setLoadingConnect(false);
        }
    };
    
    // --- DEFINITIVE FIX: DISCONNECT LOGIC MOVED HERE ---
    const handleStripeDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your Stripe account? This cannot be undone.')) {
            return;
        }
        const toastId = toast.loading('Disconnecting Stripe account...');
        try {
            const response = await fetch('/api/stripe/disconnect-account', { method: 'POST' });
            if (!response.ok) throw new Error(await response.json().then(d => d.error));
            await user?.reload(); // Reload Clerk user to get updated metadata
            await fetchAccountStatus(); // Re-fetch the account status to update the UI
            toast.success('Stripe account disconnected successfully.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', { id: toastId });
        }
    };

    const handleAddNewCard = async () => {
        setIsRedirecting(true);
        try {
            const response = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
            if (!response.ok) throw new Error(await response.json().then(d => d.error));
            const { sessionId } = await response.json();
            const stripe = await getStripe();
            if (stripe && sessionId) {
                await stripe.redirectToCheckout({ sessionId });
            } else {
                throw new Error("Stripe.js failed to load.");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
            setIsRedirecting(false);
        }
    };

    if (!isLoaded || !user) {
        return <Container><p>Loading...</p></Container>;
    }
    
    const renderSendingPayments = () => {
        if (loadingCards) return <p className={styles.noCardsText}>Loading cards...</p>;
        if (fetchError) return <p className={styles.noCardsText}>{fetchError}</p>;
        return (
            <div>
                {savedCards.length > 0 ? (
                    savedCards.map(card => (
                        <div key={card.id} className={styles.cardRow}>
                            <span>{card.brand?.toUpperCase()} ending in {card.last4}</span>
                        </div>
                    ))
                ) : (
                    <p className={styles.noCardsText}>No cards saved.</p>
                )}
                <Button onClick={handleAddNewCard} variant="secondary" style={{ marginTop: '1rem' }} disabled={isRedirecting}>
                    {isRedirecting ? 'Redirecting...' : 'Add New Card'}
                </Button>
            </div>
        );
    };

    return (
        <Container variant="narrow">
            <PageHeader title="Payment Settings" subtitle="Manage how you send and receive payments." />
            <div className={styles.grid}>
                <Card>
                    <h2 className={styles.cardTitle}>Sending Payments</h2>
                    <p className={styles.cardDescription}>Add or manage your credit and debit cards.</p>
                    {renderSendingPayments()}
                </Card>
                <Card>
                    <h2 className={styles.cardTitle}>Receiving Payments</h2>
                    <p className={styles.cardDescription}>Connect a Stripe account to receive your referral earnings and payouts.</p>
                    <div className={styles.connectStatus}>
                        Status:
                        <span className={stripeAccount?.details_submitted ? styles.statusConnected : styles.statusNotConnected}>
                            {loadingConnect ? 'Checking...' : stripeAccount?.details_submitted ? ' Account Ready' : ' Not Connected'}
                        </span>
                    </div>
                    <Button onClick={handleConnectStripe} disabled={loadingConnect} variant="primary" fullWidth>
                        {loadingConnect ? 'Processing...' : stripeAccount?.details_submitted ? 'Manage Stripe Account' : 'Connect with Stripe'}
                    </Button>
                    {/* --- DEFINITIVE FIX: DISCONNECT LINK ADDED HERE --- */}
                    {stripeAccount?.details_submitted && (
                        <a href="#" onClick={(e) => { e.preventDefault(); handleStripeDisconnect(); }} className={styles.disconnectLink}>
                            Disconnect Stripe Account
                        </a>
                    )}
                </Card>
            </div>
        </Container>
    );
};

export default PaymentsPage;