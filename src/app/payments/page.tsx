/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows Agents, Seekers, and Providers to manage their respective payment methods.
 * Change History:
 * C014 - 2025-08-09 : 11:00 - Implemented fetching and display of saved payment methods.
 * C013 - 2025-07-27 : 23:45 - Implemented definitive solution with status fetching.
 * C012 - 2025-07-27 : 22:00 - (Previous history)
 * Last Modified: 2025-08-09 : 11:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive implementation for Story VIN-PAY-1. The page now fetches the user's saved cards from the new API endpoint. It correctly handles loading and error states. It conditionally renders either a list of saved cards (using the new <SavedCardList> component) or the "Add Card" form if no cards are saved, fulfilling the user story.
 * Impact Analysis: This change brings the "Sending Payments" section of the page to a feature-complete state, providing a much better user experience.
 * Dependencies: "@clerk/nextjs", "@stripe/react-stripe-js", "react-hot-toast", and VDL UI components.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// --- NEW COMPONENT IMPORT ---
import SavedCardList from '@/app/components/ui/payments/SavedCardList';

const stripePromise = getStripe();

// Define the shape of a saved card from our new API
interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
    exp_month: number | undefined;
    exp_year: number | undefined;
}

// --- Component for Receiving Payments (Stripe Connect) - No changes here ---
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

// --- Component for Sending Payments (Stripe Payment Element Form) - No changes here ---
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

// --- THIS IS THE NEW COMPONENT FOR ORCHESTRATING THE SENDING PAYMENTS UI ---
const SendingPaymentsManager = () => {
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [loadingCards, setLoadingCards] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddCardForm, setShowAddCardForm] = useState(false);
    const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);

    useEffect(() => {
        const fetchSavedCards = async () => {
            try {
                const response = await fetch('/api/stripe/get-payment-methods');
                if (!response.ok) throw new Error('Could not fetch saved cards.');
                const data: SavedCard[] = await response.json();
                setSavedCards(data);
                if (data.length === 0) {
                    // If no cards, we need to prepare the "Add Card" form
                    createSetupIntent();
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setLoadingCards(false);
            }
        };
        fetchSavedCards();
    }, []);

    const createSetupIntent = async () => {
        try {
            const response = await fetch('/api/stripe/create-setup-intent', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to create setup intent.');
            const { clientSecret } = await response.json();
            setSetupIntentClientSecret(clientSecret);
        } catch (err) {
            toast.error("Could not prepare the payment form.");
        }
    };
    
    const handleAddNew = () => {
        // Prepare the form if it wasn't already
        if (!setupIntentClientSecret) {
            createSetupIntent();
        }
        setShowAddCardForm(true);
    };

    if (loadingCards) {
        return <Card className={styles.loadingCard}>Loading saved cards...</Card>;
    }

    if (error) {
        return <Card className={styles.loadingCard}>{error}</Card>;
    }

    // If user wants to add a new card OR they have no cards saved yet
    if (showAddCardForm || savedCards.length === 0) {
        if (setupIntentClientSecret) {
            return (
                <Elements stripe={stripePromise} options={{ clientSecret: setupIntentClientSecret, appearance: { theme: 'stripe' } }}>
                    <AddCardForm />
                </Elements>
            );
        }
        return <Card className={styles.loadingCard}>Preparing payment form...</Card>;
    }
    
    // Default view: show the list of saved cards
    return <SavedCardList cards={savedCards} onAddNew={handleAddNew} />;
}


// --- Main Page Component - Now much simpler ---
const PaymentsPage = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [loadingConnect, setLoadingConnect] = useState(false);
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);

    const userRole = (user?.publicMetadata?.role as string) || 'agent';
    const canReceivePayments = userRole === 'agent' || userRole === 'provider';
    const canSendPayments = userRole === 'seeker' || userRole === 'provider';
    
    useEffect(() => {
        if (isLoaded && !user) router.push('/sign-in');
        if (user && canReceivePayments) fetchAccountStatus();
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
                        <SendingPaymentsManager />
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