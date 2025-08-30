/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments, migrated to Kinde.
 * Change History:
 * C064 - 2025-08-26 : 15:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C063 - 2025-08-22 : 23:00 - Definitive and final version with Stateless Verification.
 * Last Modified: 2025-08-26 : 15:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been migrated from Clerk to Kinde. The `useUser` hook was replaced with `useKindeBrowserClient`. A placeholder for `user.reload()` has been noted, as Kinde's client-side hook does not have a direct equivalent, and re-fetching data is handled by the `fetchData` function. This change resolves the "Module not found" build error.
 */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import styles from './page.module.css';

interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
    exp_month: number | undefined;
    exp_year: number | undefined;
}

const PaymentsPageContent = () => {
    const { user, isAuthenticated, isLoading: isKindeLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchData = useCallback(async (showLoading = true) => {
        if (!user) return;
        if (showLoading) setIsLoading(true);
        try {
            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account', { cache: 'no-store' }),
                fetch('/api/stripe/get-payment-methods', { cache: 'no-store' })
            ]);
            if (accountRes.ok) setStripeAccount((await accountRes.json()).account);
            if (cardsRes.ok) {
                const d = await cardsRes.json();
                setSavedCards(d.cards || []);
                setDefaultPaymentMethodId(d.defaultPaymentMethodId);
            }
        } catch (error) { toast.error(getErrorMessage(error));
        } finally { if (showLoading) setIsLoading(false); }
    }, [user]);

    useEffect(() => {
        if (!isKindeLoading) {
            if (isAuthenticated) fetchData(true);
            else router.push('/api/auth/login');
        }
    }, [isKindeLoading, isAuthenticated, router, fetchData]);

    useEffect(() => {
        const status = searchParams.get('status');
        const customerId = searchParams.get('customer_id');

        if (status === 'success' && customerId && !isVerifying) {
            setIsVerifying(true);
            const toastId = toast.loading('Verifying your new card...');
            const verifyAndFetch = async () => {
                try {
                    const res = await fetch('/api/stripe/verify-and-get-cards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ customerId }),
                        cache: 'no-store',
                    });
                    if (!res.ok) throw new Error((await res.json()).error || 'Verification failed.');
                    
                    const data = await res.json();
                    setSavedCards(data.cards || []);
                    setDefaultPaymentMethodId(data.defaultPaymentMethodId);
                    toast.success('Your new card was added successfully!', { id: toastId });
                } catch (error) {
                    toast.error(getErrorMessage(error), { id: toastId });
                } finally {
                    router.replace('/payments', { scroll: false });
                    setIsVerifying(false);
                }
            };
            verifyAndFetch();
        }
    }, [searchParams, isVerifying, router]);
    
    const handleConnectStripe = async () => {
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const res = await fetch('/api/stripe/connect-account');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (data.url) window.location.href = data.url; else toast.dismiss(toastId);
        } catch (e) { toast.error(getErrorMessage(e), { id: toastId }); }
    };
    
    const handleDisconnect = async () => {
        if (!confirm('Are you sure?')) return;
        const toastId = toast.loading('Disconnecting...');
        try {
            const res = await fetch('/api/stripe/disconnect-account', { method: 'POST' });
            if (!res.ok) throw new Error((await res.json()).error);
            // NOTE: Kinde's useKindeBrowserClient does not have a `reload()` method.
            // Re-fetching the data is the correct pattern here.
            await fetchData(false);
            toast.success('Stripe account disconnected.', { id: toastId });
        } catch (e) { toast.error(getErrorMessage(e), { id: toastId }); }
    };

    const handleAddNewCard = async () => {
        const toastId = toast.loading('Redirecting...');
        try {
            const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const stripe = await getStripe();
            if (stripe && data.sessionId) await stripe.redirectToCheckout({ sessionId: data.sessionId });
            else throw new Error("Stripe.js failed to load.");
            toast.dismiss(toastId);
        } catch (e) { toast.error(getErrorMessage(e), { id: toastId }); }
    };

    const handleSetDefault = async (pmId: string) => {
        const toastId = toast.loading('Setting default...');
        try {
            const res = await fetch('/api/stripe/set-default-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethodId: pmId }) });
            if (!res.ok) throw new Error((await res.json()).error);
            setDefaultPaymentMethodId(pmId);
            toast.success('Default card updated.', { id: toastId });
        } catch (e) { toast.error(getErrorMessage(e), { id: toastId }); }
    };

    const handleRemove = async (pmId: string) => {
        if (!confirm('Are you sure?')) return;
        const originalCards = [...savedCards];
        setSavedCards(c => c.filter(card => card.id !== pmId));
        const toastId = toast.loading('Removing card...');
        try {
            const res = await fetch('/api/stripe/remove-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethodId: pmId }) });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Card removed.', { id: toastId });
        } catch (e) {
            setSavedCards(originalCards);
            toast.error(getErrorMessage(e), { id: toastId });
        }
    };

    if (isKindeLoading || isLoading) {
        return <Container><PageHeader title="Payments" /><p>Loading...</p></Container>;
    }
    
    return (
        <Container>
            <PageHeader title="Payments" subtitle="Manage your methods for sending and receiving payments." />
            
            <div className={styles.grid}>
                <div className={styles.columnStack}>
                    <Card>
                        <div className={styles.cardContent}>
                            <h3 className={styles.cardTitle}>Sending Payment Methods</h3>
                            <p className={styles.cardDescription}>Add or manage your credit and debit cards.</p>
                            <div className={styles.cardActions}>
                               <a href="#" onClick={(e) => { e.preventDefault(); handleAddNewCard(); }} className={styles.cardLink}>Create New Card</a>
                            </div>
                        </div>
                    </Card>
                    <div className={styles.savedCardsSection}>
                        <div className={styles.sectionHeader}>
                            <h3 className={styles.cardTitle}>Saved Cards</h3>
                            <p className={styles.cardDescription}>Set a default bank card or remove expired bank cards.</p>
                        </div>
                        <div className={styles.savedCardsList}>
                            {savedCards.length === 0 ? (
                                <div className={styles.noCardsMessage}>
                                    You have no saved cards.
                                </div>
                            ) : (
                                savedCards.map(card => (
                                    <div key={card.id} className={styles.savedCard}>
                                        <span className={styles.cardIcon}></span>
                                        <div className={styles.savedCardDetails}>
                                            <span>{card.brand?.toUpperCase()} **** {card.last4}
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
                                                        <DropdownMenu.Item className={styles.dropdownItem} onSelect={() => handleSetDefault(card.id)}>Set as default</DropdownMenu.Item>
                                                    )}
                                                    <DropdownMenu.Item className={`${styles.dropdownItem} ${styles.destructive}`} onSelect={() => handleRemove(card.id)}>Remove</DropdownMenu.Item>
                                                </DropdownMenu.Content>
                                            </DropdownMenu.Portal>
                                        </DropdownMenu.Root>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.columnStack}>
                    <Card>
                         <div className={styles.cardContent}>
                            <h3 className={styles.cardTitle}>Receiving Payment Methods</h3>
                            <p className={styles.cardDescription}>Connect a Stripe account to receive your referral earnings and payouts.</p>
                            <div className={styles.cardActions}>
                                 <a href="#" onClick={(e) => { e.preventDefault(); handleConnectStripe(); }} className={styles.cardLink}>
                                    {stripeAccount?.details_submitted ? 'Manage' : 'Connect'}
                                </a>
                                {stripeAccount?.details_submitted && (
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleDisconnect(); }} className={`${styles.cardLink} ${styles.disconnect}`}>Disconnect</a>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            
             <p className={styles.footerText}>Your payment details are securely processed by Stripe. We do not retain your payment data.</p>
        </Container>
    );
}

const PaymentsPage = () => {
    return (
        <Suspense fallback={<Container><PageHeader title="Payments" /><p>Loading...</p></Container>}>
            <PaymentsPageContent />
        </Suspense>
    );
};

export default PaymentsPage;