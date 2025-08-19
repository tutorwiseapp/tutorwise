/*
* Filename: src/app/payments/page.tsx
* Purpose: Allows users to manage their methods for sending and receiving payments.
* Change History:
* C048 - 2025-08-13 : 11:00 - Definitive UI refactor to match the new two-column design with a separate saved cards list.
* C047 - 2025-08-12 : 19:00 - Fixed displaying specific backend errors on the frontend.
* Last Modified: 2025-08-13 : 11:00
* Requirement ID: VIN-UI-020
* Change Summary: This is the definitive implementation of the new payments page design. The component has been fully 
* refactored to use a new page-specific stylesheet that creates the two-column grid for primary actions and a separate, 
* conditional section for the list of saved cards. The SavedCardList component has been retired, and its rendering logic is 
* now handled directly within this page to perfectly match the design.
* Impact Analysis: This change aligns the payments page perfectly with the provided design specifications, improving UI clarity and UX.
*/

'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
const PaymentsPageContent = () => {
const { user, isLoaded } = useUser();
const router = useRouter();
const searchParams = useSearchParams();
const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(true);

const fetchData = useCallback(async () => {
    if (!user) return;
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
    } catch (error) { toast.error('Could not load payment details.');
    } finally { setIsLoading(false); }
}, [user]);

useEffect(() => {
    if (isLoaded) {
        if (user) fetchData();
        else router.push('/sign-in');
    }
}, [isLoaded, user, router, fetchData]);

useEffect(() => {
    if (searchParams.get('status') === 'success') {
        toast.success('Your card was added successfully!');
        fetchData();
        window.history.replaceState({}, '', window.location.pathname);
    }
}, [searchParams, fetchData]);

const handleConnectStripe = async () => {
    const toastId = toast.loading('Redirecting to Stripe...');
    try {
        const res = await fetch('/api/stripe/connect-account');
        if (!res.ok) throw new Error("Could not get connection URL.");
        const { url } = await res.json();
        if (url) window.location.href = url; else toast.dismiss(toastId);
    } catch (e) { toast.error((e as Error).message, { id: toastId }); }
};

const handleDisconnect = async () => {
    if (!confirm('Are you sure?')) return;
    const toastId = toast.loading('Disconnecting...');
    try {
        await fetch('/api/stripe/disconnect-account', { method: 'POST' });
        await user?.reload();
        await fetchData();
        toast.success('Stripe account disconnected.', { id: toastId });
    } catch (e) { toast.error((e as Error).message, { id: toastId }); }
};

const handleAddNewCard = async () => {
    const toastId = toast.loading('Redirecting...');
    try {
        const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create session.');
        const { sessionId } = await res.json();
        const stripe = await getStripe();
        if (stripe && sessionId) await stripe.redirectToCheckout({ sessionId });
        else throw new Error("Stripe.js failed.");
        toast.dismiss(toastId);
    } catch (e) { toast.error((e as Error).message, { id: toastId }); }
};

const handleSetDefault = async (pmId: string) => {
    const toastId = toast.loading('Setting default...');
    try {
        const res = await fetch('/api/stripe/set-default-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethodId: pmId }) });
        if (!res.ok) throw new Error((await res.json()).error);
        setDefaultPaymentMethodId(pmId);
        toast.success('Default card updated.', { id: toastId });
    } catch (e) { toast.error((e as Error).message, { id: toastId }); }
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
        toast.error((e as Error).message, { id: toastId });
    }
};

if (!isLoaded || isLoading) {
    return <Container><PageHeader title="Payments" /><p>Loading...</p></Container>;
}

return (
    <Container>
        <PageHeader title="Payments" subtitle="Manage your methods for sending and receiving payments." />
        
        <div className={styles.grid}>
            <Card className={styles.card}>
                <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>Sending Payment Methods</h3>
                    <p className={styles.cardDescription}>Add or manage your credit and debit cards.</p>
                    <div className={styles.cardActions}>
                       <a href="#" onClick={(e) => { e.preventDefault(); handleAddNewCard(); }} className={styles.cardLink}>Create New Card</a>
                    </div>
                </div>
            </Card>

            <Card className={styles.card}>
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

        {savedCards.length > 0 && (
            <div className={styles.savedCardsSection}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.cardTitle}>Saved Cards</h3>
                    <p className={styles.cardDescription}>Set a default bank card or remove expired bank cards.</p>
                </div>
                <div className={styles.savedCardsList}>
                    {savedCards.map(card => (
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
                    ))}
                </div>
            </div>
        )}
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