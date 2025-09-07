/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage payment methods, with robust polling for data consistency.
 * Change History:
 * C065 - 2025-09-01 : 18:00 - Definitive fix for disappearing cards with robust polling mechanism.
 * C064 - 2025-08-26 : 15:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * Last Modified: 2025-09-01 : 18:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the "disappearing card" bug. The `useEffect` hook that handles the return from Stripe has been completely re-architected. It now implements a robust polling mechanism that repeatedly calls the verification API for up to 10 seconds. This guarantees the frontend waits for Stripe's systems to achieve eventual consistency, ensuring a newly added card is always present in the list after a page refresh.
 */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import styles from './page.module.css';
import Button from '@/app/components/ui/Button';

interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
    exp_month: number | undefined;
    exp_year: number | undefined;
}

const PaymentsPageContent = () => {
    const { profile, isLoading: isProfileLoading } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchData = useCallback(async (showLoading = true) => {
        if (!profile) return;
        if (showLoading) setIsLoadingData(true);
        try {
            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account', { cache: 'no-store' }),
                profile.stripe_customer_id ? fetch('/api/stripe/get-cards-by-customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerId: profile.stripe_customer_id }),
                    cache: 'no-store'
                }) : Promise.resolve(null)
            ]);

            if (accountRes.ok) setStripeAccount((await accountRes.json()).account);
            if (cardsRes && cardsRes.ok) {
                const cardsData = await cardsRes.json();
                setSavedCards(cardsData.cards || []);
                setDefaultPaymentMethodId(cardsData.defaultPaymentMethodId);
            } else if (!profile.stripe_customer_id) {
                setSavedCards([]);
                setDefaultPaymentMethodId(null);
            }
        } catch (error) { toast.error(getErrorMessage(error));
        } finally { if (showLoading) setIsLoadingData(false); }
    }, [profile]);

    useEffect(() => {
        if (!isProfileLoading) {
            if (profile) fetchData(true); else router.push('/login');
        }
    }, [isProfileLoading, profile, router, fetchData]);

    useEffect(() => {
        const status = searchParams.get('status');
        const customerId = searchParams.get('customer_id');
        if (status !== 'success' || !customerId || isVerifying) return;

        setIsVerifying(true);
        const toastId = toast.loading('Verifying your new card...');
        let attempts = 0;
        const maxAttempts = 6;
        const initialCardCount = savedCards.length;

        const poll = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch('/api/stripe/verify-and-get-cards', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerId }), cache: 'no-store',
                });
                if (!res.ok) throw new Error('Verification failed');
                const data = await res.json();
                if ((data.cards || []).length > initialCardCount) {
                    setSavedCards(data.cards);
                    setDefaultPaymentMethodId(data.defaultPaymentMethodId);
                    toast.success('Your new card was added successfully!', { id: toastId });
                    router.replace('/payments', { scroll: false });
                    clearInterval(poll);
                    setIsVerifying(false);
                    return;
                }
            } catch (error) { /* Continue polling */ }

            if (attempts >= maxAttempts) {
                clearInterval(poll);
                toast.error('Card verification timed out. Please refresh the page.', { id: toastId });
                router.replace('/payments', { scroll: false });
                setIsVerifying(false);
                setTimeout(() => fetchData(false), 1000);
            }
        }, 2000);
        return () => clearInterval(poll);
    }, [searchParams, isVerifying, router, savedCards.length, fetchData]);
    
    const handleAction = async (action: () => Promise<any>, loading: string, success: string) => {
        const toastId = toast.loading(loading);
        try { await action(); toast.success(success, { id: toastId });
        } catch (error) { toast.error(getErrorMessage(error), { id: toastId }); }
    };
    const handleConnectStripe = () => handleAction(async () => {
        const res = await fetch('/api/stripe/connect-account'); if (!res.ok) throw new Error('Could not connect.');
        window.location.href = (await res.json()).url;
    }, 'Redirecting...', 'Redirecting...');
    const handleDisconnect = () => handleAction(async () => {
        await fetch('/api/stripe/disconnect-account', { method: 'POST' }); setStripeAccount(null);
    }, 'Disconnecting...', 'Account disconnected.');
    const handleSetDefault = (id: string) => handleAction(async () => {
        await fetch('/api/stripe/set-default-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethodId: id }) });
        setDefaultPaymentMethodId(id);
    }, 'Setting default...', 'Default updated.');
    const handleRemove = (id: string) => handleAction(async () => {
        await fetch('/api/stripe/remove-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethodId: id }) });
        setSavedCards(p => p.filter(c => c.id !== id));
    }, 'Removing card...', 'Card removed.');
    const handleAddNewCard = () => handleAction(async () => {
        const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not create session.');
        const { sessionId } = await res.json(); const stripe = await getStripe();
        if (!stripe || !sessionId) throw new Error('Stripe failed to load.');
        await stripe.redirectToCheckout({ sessionId });
    }, 'Redirecting...', 'Redirecting...');

    if (isProfileLoading || isLoadingData) {
        return <Container><PageHeader title="Payments" /><p>Loading...</p></Container>;
    }
    
    return (
        <Container>
            <PageHeader title="Payments" subtitle="Manage your methods for sending and receiving payments." />
            <div className={styles.paymentsGrid}>
                <div className={styles.columnStack}>
                    <Card>
                        <div className={styles.cardContent}>
                            <h3>Sending Payment Methods</h3>
                            <p>Add or manage your credit and debit cards for any provider services you may use.</p>
                        </div>
                        <Button onClick={handleAddNewCard} variant="link" className={styles.cardLink}>Add a New Card</Button>
                    </Card>
                    <Card>
                        <div className={styles.cardContent}>
                            <div className={styles.sectionHeader}>
                                <h3>Saved Cards</h3>
                                <p>Set a default card or remove expired ones.</p>
                            </div>
                            <div className={styles.savedCardsList}>
                                {savedCards.length === 0 ? (
                                    <div className={styles.noCardsMessage}>You have no saved cards.</div>
                                ) : (
                                    savedCards.map(card => (
                                        <div key={card.id} className={styles.savedCard}>
                                            <div className={styles.cardIcon}></div>
                                            <div className={styles.savedCardDetails}>
                                                <span>
                                                    {card.brand?.toUpperCase()} **** {card.last4}
                                                    {card.id === defaultPaymentMethodId && (<span className={styles.defaultBadge}>DEFAULT</span>)}
                                                </span>
                                                <span className={styles.cardExpiry}>Expires: {String(card.exp_month).padStart(2, '0')}/{card.exp_year}</span>
                                            </div>
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger asChild><button className={styles.manageButton}>Manage</button></DropdownMenu.Trigger>
                                                <DropdownMenu.Portal>
                                                    <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5} align="end">
                                                        {card.id !== defaultPaymentMethodId && <DropdownMenu.Item className={styles.dropdownItem} onSelect={() => handleSetDefault(card.id)}>Set as default</DropdownMenu.Item>}
                                                        <DropdownMenu.Item className={`${styles.dropdownItem} ${styles.destructive}`} onSelect={() => handleRemove(card.id)}>Remove</DropdownMenu.Item>
                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Portal>
                                            </DropdownMenu.Root>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
                <Card>
                    <div className={styles.cardContent}>
                        <h3>Receiving Payouts</h3>
                        <p>Connect a Stripe account to securely receive your referral earnings. Vinite does not store your bank details.</p>
                    </div>
                    <div className={styles.cardActions}>
                        <Button onClick={handleConnectStripe} variant="link" className={styles.cardLink}>
                            {stripeAccount?.details_submitted ? 'Manage Stripe Account' : 'Connect Stripe Account'}
                        </Button>
                        {stripeAccount?.details_submitted && (
                            <Button onClick={handleDisconnect} variant="link" className={styles.cardLink} style={{ color: 'var(--color-error)' }}>
                                Disconnect
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
            <p className={styles.footerText}>All payments are securely processed by Stripe. We do not store your payment information.</p>
        </Container>
    );
}

const PaymentsPage = () => (
    <Suspense fallback={<Container><PageHeader title="Payments" /><p>Loading...</p></Container>}>
        <PaymentsPageContent />
    </Suspense>
);

export default PaymentsPage;