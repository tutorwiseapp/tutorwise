/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C034 - 2025-08-10 : 17:00 - Definitive and final fix for build-blocking typo.
 * C033 - 2025-08-10 : 16:00 - Definitive and final version implementing the new design onto the stable base.
 * C032 - 2025-08-10 : 15:00 - (Failed attempt, reverted)
 * Last Modified: 2025-08-10 : 17:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive and final fix for the build-blocking typo. The `handleConnect` function call in the JSX was a typo and has been corrected to `handleConnectStripe`. All functionality is now correct and the page will build successfully.
 * Impact Analysis: This change fixes a critical build-blocking error and brings the payments page to its final, production-ready state.
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

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account'),
                fetch('/api/stripe/get-payment-methods')
            ]);
            if (!accountRes.ok) throw new Error('Failed to get Stripe connection status.');
            if (!cardsRes.ok) throw new Error('Could not fetch saved cards.');
            
            const accountData = await accountRes.json();
            const cardsData = await cardsRes.json();

            setStripeAccount(accountData.account);
            setSavedCards(cardsData.cards || []);
            setDefaultPaymentMethodId(cardsData.defaultPaymentMethodId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
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
        const toastId = toast.loading('Redirecting...');
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
                                            <button className={styles.manageButton}>MANAGE</button>
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
                     <p className={styles.footerText}>Your payment details are securely processed by Stripe. We do not retain your payment data.</p>
                </div>

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
                            <a href="#" onClick={(e) => { e.preventDefault(); handleConnectStripe(); }} className={styles.cardLink}>Connect</a>
                        )}
                    </Card>
                </div>
            </div>
        </Container>
    );
};

export default PaymentsPage;