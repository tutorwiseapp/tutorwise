/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C027 - 2025-08-10 : 09:00 - Definitive fix for client-side race condition.
 * C026 - 2025-08-10 : 08:00 - Definitive fix for client-side race condition on page refresh.
 * C025 - 2025-08-10 : 06:00 - Definitive fix for build error by correcting import path.
 * Last Modified: 2025-08-10 : 09:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive and final fix. The complete, fully functional code for the page has been restored. The data-fetching logic has been wrapped in `useCallback` and is now correctly called from a `useEffect` hook that properly waits for the `isLoaded` and `user` state from Clerk. This permanently fixes the client-side race condition on page refresh without removing any functionality.
 * Impact Analysis: This change restores all features to the payments page and fixes the last remaining critical bug.
 * Dependencies: "@clerk/nextjs", "@/lib/utils/get-stripejs", "react-hot-toast", Radix UI, and VDL UI components.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
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

    // --- DEFINITIVE FIX FOR RACE CONDITION ---
    const fetchData = useCallback(async () => {
        // Guard against running this function without a user
        if (!user) return;
        
        setIsLoading(true);
        try {
            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account'),
                fetch('/api/stripe/get-payment-methods')
            ]);
            if (!accountRes.ok) throw new Error('Failed to get Stripe status.');
            if (!cardsRes.ok) throw new Error('Could not fetch saved cards.');
            
            const accountData = await accountRes.json();
            const cardsData = await cardsRes.json();

            setStripeAccount(accountData.account);
            setSavedCards(cardsData.cards);
            setDefaultPaymentMethodId(cardsData.defaultPaymentMethodId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [user]); // Dependency on `user` ensures it has the latest data.

    useEffect(() => {
        // Only proceed once Clerk has finished loading its state.
        if (isLoaded) {
            if (user) {
                // If a user exists, fetch their data.
                fetchData();
            } else {
                // If Clerk confirms no user is logged in, redirect.
                router.push('/sign-in');
            }
        }
    }, [isLoaded, user, router, fetchData]);

    const handleConnect = async () => {
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
            const response = await fetch('/api/stripe/disconnect-account', { method: 'POST' });
            if (!response.ok) throw new Error(await response.json().then(d => d.error));
            await user?.reload();
            await fetchData();
            toast.success('Stripe account disconnected.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', { id: toastId });
        }
    };

    const handleAddNewCard = async () => {
        const toastId = toast.loading('Redirecting to Stripe...');
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
            toast.dismiss(toastId);
        } catch (error) {
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
            if (!response.ok) throw new Error('Failed to set default card.');
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
            const response = await fetch('/api/stripe/remove-card', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId }) 
            });
            if (!response.ok) throw new Error('Failed to remove card.');
            setSavedCards(cards => cards.filter(c => c.id !== paymentMethodId));
            toast.success('Card removed.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
        }
    };

    if (!isLoaded || isLoading) {
        return (
            <Container>
                <PageHeader title="Payment Settings" />
                <div className={styles.grid}>
                    <Card><p>Loading Payment Methods...</p></Card>
                    <Card><p>Loading Connection Status...</p></Card>
                </div>
            </Container>
        );
    }
    
    return (
        <Container>
            <PageHeader title="Payment Settings" />
            
            <div className={styles.grid}>
                <div className={styles.cardContainer}>
                    <Card>
                        <h3 className={styles.cardTitle}>Sending Payment Methods</h3>
                        <p className={styles.cardDescription}>Add or manage your credit and debit cards.</p>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleAddNewCard(); }} className={styles.cardLink}>
                            Create New Card
                        </a>
                    </Card>

                    {savedCards.length > 0 && (
                        <div className={styles.savedCardsSection}>
                            <h3 className={styles.sectionTitle}>Saved Cards</h3>
                            <p className={styles.cardDescription}>Set a default bank card or remove expired bank cards.</p>
                            {savedCards.map(card => (
                                <Card key={card.id} className={styles.savedCard}>
                                    <span className={styles.cardIcon}></span>
                                    <div className={styles.savedCardDetails}>
                                        <span>{card.brand?.toUpperCase()} **** **** **** {card.last4}
                                            {card.id === defaultPaymentMethodId && <span className={styles.defaultBadge}>DEFAULT</span>}
                                        </span>
                                        <span className={styles.cardExpiry}>Expiration: {String(card.exp_month).padStart(2, '0')}/{card.exp_year}</span>
                                    </div>
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger asChild>
                                            <button className={styles.manageButton}>Manage</button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5} align="end">
                                                {card.id !== defaultPaymentMethodId && (
                                                    <DropdownMenu.Item className={styles.dropdownItem} onSelect={() => handleSetDefault(card.id)}>
                                                        Set as default
                                                    </DropdownMenu.Item>
                                                )}
                                                <DropdownMenu.Item className={`${styles.dropdownItem} ${styles.destructive}`} onSelect={() => handleRemove(card.id)}>
                                                    Remove
                                                </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Root>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                 <div className={styles.cardContainer}>
                    <Card>
                        <h3 className={styles.cardTitle}>Receiving Payment Methods</h3>
                        <p className={styles.cardDescription}>Connect a Stripe account to receive your referral earnings and payouts.</p>
                        {stripeAccount?.details_submitted ? (
                            <div className={styles.cardActions}>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleConnect(); }} className={styles.cardLink}>Manage</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleDisconnect(); }} className={`${styles.cardLink} ${styles.disconnect}`}>Disconnect</a>
                            </div>
                        ) : (
                            <a href="#" onClick={(e) => { e.preventDefault(); handleConnect(); }} className={styles.cardLink}>Connect</a>
                        )}
                    </Card>
                </div>
            </div>
        </Container>
    );
};

export default PaymentsPage;