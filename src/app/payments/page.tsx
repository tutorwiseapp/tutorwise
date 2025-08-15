/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C016 - 2025-08-09 : 13:00 - Definitive UI and logic refactor.
 * C015 - 2025-08-09 : 12:00 - TEMPORARY: Enabled sending payments for Agents.
 * C014 - 2025-08-09 : 11:00 - Implemented fetching and display of saved payment methods.
 * Last Modified: 2025-08-09 : 13:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive, final version of the payments page. It has been completely refactored for clarity, correctness, and UI polish. It correctly handles all user roles, manages application state robustly, and provides a clean, two-column layout for managing payment methods. This resolves all outstanding bugs and UI issues.
 * Impact Analysis: This change brings the payments page to a feature-complete and production-ready state.
 * Dependencies: "@clerk/nextjs", "@stripe/react-stripe-js", "react-hot-toast", and VDL UI components.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

const stripePromise = getStripe();

interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
}

// --- Reusable Component for the "Add Card" Form ---
const AddCardForm = ({ onCancel, clientSecret }: { onCancel: () => void; clientSecret: string }) => {
    return (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm onCancel={onCancel} />
        </Elements>
    );
};

const CheckoutForm = ({ onCancel }: { onCancel: () => void }) => {
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
        <form onSubmit={handleSubmit}>
            <div className={styles.paymentElementWrapper}>
                <PaymentElement />
            </div>
            <div className={styles.formActions}>
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !stripe || !elements} variant="primary">
                    {isLoading ? 'Saving...' : 'Save Card'}
                </Button>
            </div>
        </form>
    );
};

// --- Main Page Component ---
const PaymentsPage = () => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    
    // State for Receiving Payments
    const [loadingConnect, setLoadingConnect] = useState(false);
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);

    // State for Sending Payments
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [loadingCards, setLoadingCards] = useState(true);
    const [showAddCardForm, setShowAddCardForm] = useState(false);
    const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);

    const userRole = (user?.publicMetadata?.role as string) || 'agent';
    const canReceivePayments = userRole === 'agent' || userRole === 'provider';
    const canSendPayments = userRole === 'seeker' || userRole === 'provider';

    // Fetch data on load
    useEffect(() => {
        if (isLoaded && !user) router.push('/sign-in');
        if (user) {
            if (canReceivePayments) fetchAccountStatus();
            if (canSendPayments) fetchSavedCards();
        }
    }, [isLoaded, user]);

    const fetchAccountStatus = async () => {
        setLoadingConnect(true);
        try {
            const response = await fetch('/api/stripe/get-connect-account');
            if (!response.ok) throw new Error(await response.json().then(d => d.error));
            setStripeAccount((await response.json()).account);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not get Stripe status.");
        } finally {
            setLoadingConnect(false);
        }
    };

    const fetchSavedCards = async () => {
        setLoadingCards(true);
        try {
            const response = await fetch('/api/stripe/get-payment-methods');
            if (!response.ok) throw new Error('Could not fetch saved cards.');
            const data: SavedCard[] = await response.json();
            setSavedCards(data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoadingCards(false);
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

    const handleAddNewCardClick = async () => {
        if (!setupIntentClientSecret) {
            try {
                const response = await fetch('/api/stripe/create-setup-intent', { method: 'POST' });
                if (!response.ok) throw new Error('Failed to prepare payment form.');
                const { clientSecret } = await response.json();
                setSetupIntentClientSecret(clientSecret);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not prepare the payment form.");
                return;
            }
        }
        setShowAddCardForm(true);
    };

    if (!isLoaded || !user) {
        return <Container><p>Loading...</p></Container>;
    }
    
    return (
        <Container variant="narrow">
            <PageHeader title="Payment Settings" subtitle="Manage how you send and receive payments." />
            
            <div className={styles.grid}>
                {canSendPayments && (
                    <Card>
                        <h2 className={styles.cardTitle}>Sending Payments</h2>
                        <p className={styles.cardDescription}>Add or manage your credit and debit cards for paying Providers.</p>
                        
                        {loadingCards ? <p>Loading cards...</p> : (
                            showAddCardForm && setupIntentClientSecret ? (
                                <AddCardForm 
                                    clientSecret={setupIntentClientSecret}
                                    onCancel={() => setShowAddCardForm(false)} 
                                />
                            ) : (
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
                                    <Button onClick={handleAddNewCardClick} variant="secondary" style={{ marginTop: '1rem' }}>
                                        Add New Card
                                    </Button>
                                </div>
                            )
                        )}
                    </Card>
                )}
                
                {canReceivePayments && (
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
                )}
            </div>
        </Container>
    );
};

export default PaymentsPage;