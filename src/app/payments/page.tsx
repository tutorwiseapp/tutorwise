/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows Agents, Seekers, and Providers to manage their respective payment methods.
 * Change History:
 * C013 - 2025-07-27 : 23:45 - Implemented definitive solution with status fetching.
 * ... (previous history)
 * Last Modified: 2025-07-27 : 23:45
 * Requirement ID: VIN-A-005
 * Change Summary: This is the definitive and final version. It now correctly fetches the
 * Stripe Connect account status on page load and uses `react-hot-toast` for notifications.
 * The UI is fully role-aware and all dependencies and imports are corrected.
 * Impact Analysis: This change makes the payments page fully functional, secure, and robust.
 * Dependencies: "@clerk/nextjs", "@stripe/react-stripe-js", "@stripe/stripe-js", "react-hot-toast", and VDL components.
 */
'use client';

import { useState, useEffect, FC } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import styles from './page.module.css';

const stripePromise = getStripe();

// --- Component for Receiving Payments (Stripe Connect) ---
const StripeConnectCard = ({ isLoading, isConnected, onConnect }: { isLoading: boolean, isConnected: boolean, onConnect: () => void }) => (
    <Card className={styles.paymentCard}>
        <h2 className={styles.cardTitle}>Receiving Payments</h2>
        <p className={styles.cardDescription}>Connect a Stripe account to receive your referral earnings and payouts.</p>
        <div className={styles.connectStatus}>
            Status:
            <span className={isConnected ? styles.statusConnected : styles.statusNotConnected}>
                {isConnected ? ' Account Ready' : ' Not Connected'}
            </span>
        </div>
        <Button onClick={onConnect} disabled={isLoading} variant="primary" fullWidth className={styles.cardButton}>
            {isLoading ? 'Processing...' : isConnected ? 'Manage Stripe Account' : 'Connect with Stripe'}
        </Button>
    </Card>
);

// --- Component for Sending Payments (Stripe Payment Element Form) ---
const AddCardForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsLoading(true);
        
        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: { return_url: `${window.location.origin}/payments?setup_success=true` },
        });

        if (error) {
            toast.error(error.message || 'An unexpected error occurred.');
            setIsLoading(false);
        }
    };

    return (
        <Card className={styles.paymentCard}>
            <h2 className={styles.cardTitle}>Sending Payments</h2>
            <p className={styles.cardDescription}>Add a credit or debit card to pay for services or platform fees.</p>
            <form onSubmit={handleSubmit}>
                <div className={styles.paymentElementWrapper}>
                    <PaymentElement />
                </div>
                <Button type="submit" disabled={isLoading || !stripe || !elements} variant="primary" fullWidth className={styles.cardButton}>
                    {isLoading ? 'Saving...' : 'Save Card'}
                </Button>
            </form>
        </Card>
    );
};


// --- Main Page Component ---
const PaymentsPage = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [loadingConnect, setLoadingConnect] = useState(false);
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);

    const userRole = (user?.publicMetadata?.role as string) || 'agent';
    const canReceivePayments = userRole === 'agent' || userRole === 'provider';
    const canSendPayments = userRole === 'seeker' || userRole === 'provider';
    
    useEffect(() => {
        if (isLoaded && !user) {
            router.push('/sign-in');
        }
        if (user) {
            if (canReceivePayments) fetchAccountStatus();
            if (canSendPayments) createSetupIntent();
        }
    }, [isLoaded, user, router]);

    const fetchAccountStatus = async () => {
        setLoadingConnect(true);
        try {
            const response = await fetch('/api/stripe/get-connect-account');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch Stripe status');
            }
            const data = await response.json();
            setStripeAccount(data.account);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setLoadingConnect(false);
        }
    };

    const createSetupIntent = async () => {
        try {
            const response = await fetch('/api/stripe/create-setup-intent', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to create setup intent.');
            const { clientSecret } = await response.json();
            setSetupIntentClientSecret(clientSecret);
        } catch (error) {
            toast.error("Could not prepare the payment form.");
        }
    };
    
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

    if (!isLoaded || !user) {
        return <Container><p>Loading...</p></Container>;
    }
    
    const isStripeOnboardingComplete = !!stripeAccount?.details_submitted;
    
    return (
        <Container variant="narrow">
            <PageHeader title="Payment Settings" subtitle="Manage how you send and receive payments." />
            
            <div className={styles.grid}>
                {canSendPayments && (
                    <div className={styles.column}>
                        {setupIntentClientSecret ? (
                            <Elements stripe={stripePromise} options={{ clientSecret: setupIntentClientSecret, appearance: { theme: 'stripe' } }}>
                                <AddCardForm />
                            </Elements>
                        ) : (
                            <Card className={styles.loadingCard}>Loading payment form...</Card>
                        )}
                    </div>
                )}
                
                {canReceivePayments && (
                    <div className={styles.column}>
                        <StripeConnectCard
                            isLoading={loadingConnect}
                            isConnected={isStripeOnboardingComplete}
                            onConnect={handleConnectStripe}
                        />
                    </div>
                )}
                
                {!canReceivePayments && canSendPayments && <div className={styles.column}></div>}
            </div>
        </Container>
    );
};

export default PaymentsPage;