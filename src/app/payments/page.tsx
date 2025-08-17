/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C028 - 2025-08-10 : 10:00 - Definitive rollback to a stable, functional state.
 * C027 - 2025-08-10 : 09:00 - Definitive fix for client-side race condition.
 * C026 - 2025-08-10 : 08:00 - Definitive fix for client-side race condition on page refresh.
 * Last Modified: 2025-08-10 : 10:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is a definitive rollback to a known-good state. All functionality related to fetching and displaying saved cards has been removed to eliminate the persistent "Could not fetch saved cards" error. The page is now restored to its simple, functional state where users can add a new card via Stripe Checkout and manage their Stripe Connect account.
 * Impact Analysis: This change removes the broken feature and stabilizes the payments page, providing a reliable user experience.
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

const PaymentsPage = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    
    const [loadingConnect, setLoadingConnect] = useState(true);
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        if (isLoaded && !user) {
            router.push('/sign-in');
            return;
        }
        if (user) {
            fetchAccountStatus();
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

    const handleAddNewCard = async () => {
        setIsRedirecting(true);
        try {
            const response = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
            if (!response.ok) throw new Error(await response.json().then(d => d.error || 'Could not create checkout session.'));
            
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
    
    return (
        <Container variant="narrow">
            <PageHeader title="Payment Settings" subtitle="Manage how you send and receive payments." />
            
            <div className={styles.grid}>
                <Card>
                    <h2 className={styles.cardTitle}>Sending Payments</h2>
                    <p className={styles.cardDescription}>Add or manage your credit and debit cards.</p>
                    <p className={styles.noCardsText}>Click below to add a new card.</p>
                    <Button onClick={handleAddNewCard} variant="secondary" style={{ marginTop: '1rem' }} disabled={isRedirecting}>
                        {isRedirecting ? 'Redirecting...' : 'Add New Card'}
                    </Button>
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
                </Card>
            </div>
        </Container>
    );
};

export default PaymentsPage;