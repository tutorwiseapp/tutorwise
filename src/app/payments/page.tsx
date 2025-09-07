/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage payment methods, with robust polling for data consistency.
 * Change History:
 * C069 - 2025-09-07 : Added empty second card to right column for height alignment
 * C065 - 2025-09-01 : 18:00 - Definitive fix for disappearing cards with robust polling mechanism.
 * C064 - 2025-08-26 : 15:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * Last Modified: 2025-09-07 : Added empty second card
 * Requirement ID: VIN-PAY-1
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

    // Enhanced fetchData function with proper race condition handling
    const fetchData = useCallback(async (showLoading = true) => {
        if (!profile) return;
        
        if (showLoading) setIsLoadingData(true);

        try {
            // Always fetch the Stripe Connect account
            const accountPromise = fetch('/api/stripe/get-connect-account', { 
                cache: 'no-store' 
            });

            // Only fetch cards if we have a valid stripe_customer_id
            const promises: Promise<Response>[] = [accountPromise];
            
            if (profile.stripe_customer_id) {
                const cardsPromise = fetch('/api/stripe/get-cards-by-customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerId: profile.stripe_customer_id }),
                    cache: 'no-store'
                });
                promises.push(cardsPromise);
            }

            const responses = await Promise.all(promises);
            const [accountRes, cardsRes] = responses;

            // Process account response
            if (accountRes.ok) {
                const accountData = await accountRes.json();
                setStripeAccount(accountData.account);
            }

            // Process cards response only if it exists and is successful
            if (cardsRes && cardsRes.ok) {
                const cardsData = await cardsRes.json();
                setSavedCards(cardsData.cards || []);
                setDefaultPaymentMethodId(cardsData.defaultPaymentMethodId);
            } else if (!profile.stripe_customer_id) {
                // If no customer ID, ensure cards are empty
                setSavedCards([]);
                setDefaultPaymentMethodId(null);
            }

        } catch (error) { 
            console.error('Error fetching payment data:', error);
            toast.error(getErrorMessage(error));
        } finally { 
            if (showLoading) setIsLoadingData(false); 
        }
    }, [profile]);

    // Main data loading effect
    useEffect(() => {
        if (!isProfileLoading) {
            if (profile) {
                fetchData(true);
            } else {
                router.push('/login');
            }
        }
    }, [isProfileLoading, profile, router, fetchData]);

    // Enhanced verification polling with better error handling
    useEffect(() => {
        const status = searchParams.get('status');
        const customerId = searchParams.get('customer_id');

        if (status === 'success' && customerId && !isVerifying) {
            setIsVerifying(true);
            const toastId = toast.loading('Verifying your new card...');
            let attempts = 0;
            const maxAttempts = 6;
            const initialCardCount = savedCards.length;

            const pollForNewCard = async () => {
                try {
                    const res = await fetch('/api/stripe/verify-and-get-cards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ customerId }),
                        cache: 'no-store',
                    });

                    if (!res.ok) {
                        throw new Error(`Verification API error: ${res.status}`);
                    }
                    
                    const data = await res.json();
                    const newCards: SavedCard[] = data.cards || [];

                    // Success condition: new card found
                    if (newCards.length > initialCardCount) {
                        setSavedCards(newCards);
                        setDefaultPaymentMethodId(data.defaultPaymentMethodId);
                        toast.success('Your new card was added successfully!', { id: toastId });
                        router.replace('/payments', { scroll: false });
                        setIsVerifying(false);
                        return true;
                    }

                    return false;
                } catch (error) {
                    console.error('Polling error:', error);
                    return false;
                }
            };

            const poll = setInterval(async () => {
                attempts++;
                
                const success = await pollForNewCard();
                if (success) {
                    clearInterval(poll);
                    return;
                }

                if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    toast.error('Card verification timed out. Please refresh the page to see your new card.', { id: toastId });
                    router.replace('/payments', { scroll: false });
                    setIsVerifying(false);
                    
                    // Attempt one final fetch after timeout
                    setTimeout(() => fetchData(false), 1000);
                }
            }, 2000);

            // Cleanup interval if component unmounts
            return () => clearInterval(poll);
        }
    }, [searchParams, isVerifying, router, savedCards.length, fetchData]);
    
    const handleConnectStripe = async () => {
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const response = await fetch('/api/stripe/connect-account');
            if (!response.ok) throw new Error('Could not connect to Stripe.');
            const { url } = await response.json();
            window.location.href = url;
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(getErrorMessage(error), { id: toastId });
        }
    };
    
    const handleDisconnect = async () => {
        const toastId = toast.loading('Disconnecting your Stripe account...');
        try {
            await fetch('/api/stripe/disconnect-account', { method: 'POST' });
            setStripeAccount(null);
            toast.success('Stripe account disconnected.', { id: toastId });
        } catch (error) {
            toast.error(getErrorMessage(error), { id: toastId });
        }
    };
    
    const handleSetDefault = async (paymentMethodId: string) => {
        const toastId = toast.loading('Setting new default...');
        try {
            await fetch('/api/stripe/set-default-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId }),
            });
            setDefaultPaymentMethodId(paymentMethodId);
            toast.success('Default payment method updated.', { id: toastId });
        } catch (error) {
            toast.error(getErrorMessage(error), { id: toastId });
        }
    };

    const handleRemove = async (paymentMethodId: string) => {
        const toastId = toast.loading('Removing card...');
        try {
            await fetch('/api/stripe/remove-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId }),
            });
            setSavedCards(prev => prev.filter(card => card.id !== paymentMethodId));
            toast.success('Card removed successfully.', { id: toastId });
        } catch (error) {
            toast.error(getErrorMessage(error), { id: toastId });
        }
    };

    const handleAddNewCard = async () => {
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                cache: 'no-store',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Could not create Stripe session.');
            }

            const { sessionId } = await response.json();
            if (!sessionId) {
                throw new Error('Invalid session ID received.');
            }

            const stripe = await getStripe();
            if (!stripe) {
                throw new Error('Stripe.js failed to load.');
            }

            await stripe.redirectToCheckout({ sessionId });
            toast.dismiss(toastId);

        } catch (error) {
            console.error('Add card error:', error);
            toast.error(getErrorMessage(error), { id: toastId });
        }
    };

    const handleRefreshCards = async () => {
        await fetchData(true);
        toast.success('Card data refreshed');
    };

    if (isProfileLoading || isLoadingData) {
        return (
            <Container>
                <PageHeader title="Payments" />
                <p>Loading payment methods...</p>
            </Container>
        );
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
                               <Button onClick={handleAddNewCard} variant="link">Add a New Card</Button>
                            </div>
                        </div>
                    </Card>
                    <div className={styles.savedCardsSection}>
                        <div className={styles.sectionHeader}>
                            <h3 className={styles.cardTitle}>Saved Cards</h3>
                            <p className={styles.cardDescription}>
                                Set a default card or remove expired ones.
                                <Button onClick={handleRefreshCards} variant="link" style={{marginLeft: '10px', fontSize: '12px'}}>
                                    🔄 Refresh
                                </Button>
                            </p>
                        </div>
                        <div className={styles.savedCardsList}>
                            {savedCards.length === 0 ? (
                                <div className={styles.noCardsMessage}>
                                    {profile?.stripe_customer_id ? 
                                        "You have no saved cards." : 
                                        "Add your first card to get started."
                                    }
                                </div>
                            ) : (
                                savedCards.map(card => (
                                    <div key={card.id} className={styles.savedCard}>
                                        <span className={styles.cardIcon}></span>
                                        <div className={styles.savedCardDetails}>
                                            <span>
                                                {card.brand?.toUpperCase()} **** {card.last4}
                                                {card.id === defaultPaymentMethodId && (
                                                    <span className={styles.defaultBadge}>DEFAULT</span>
                                                )}
                                            </span>
                                            <span className={styles.cardExpiry}>
                                                Expires: {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                                            </span>
                                        </div>
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger asChild>
                                                <button className={styles.manageButton}>Manage</button>
                                            </DropdownMenu.Trigger>
                                            <DropdownMenu.Portal>
                                                <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5} align="end">
                                                    {card.id !== defaultPaymentMethodId && (
                                                        <DropdownMenu.Item 
                                                            className={styles.dropdownItem} 
                                                            onSelect={() => handleSetDefault(card.id)}
                                                        >
                                                            Set as default
                                                        </DropdownMenu.Item>
                                                    )}
                                                    <DropdownMenu.Item 
                                                        className={`${styles.dropdownItem} ${styles.destructive}`} 
                                                        onSelect={() => handleRemove(card.id)}
                                                    >
                                                        Remove
                                                    </DropdownMenu.Item>
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
                            <p className={styles.cardDescription}>Connect a Stripe account to receive your referral earnings.</p>
                            <div className={styles.cardActions}>
                                 <Button onClick={handleConnectStripe} variant="link">
                                    {stripeAccount?.details_submitted ? 'Manage Stripe Account' : 'Connect Stripe Account'}
                                </Button>
                                {stripeAccount?.details_submitted && (
                                    <Button onClick={handleDisconnect} variant="link" className={styles.disconnect}>
                                        Disconnect
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                    {/* Empty second card to match left column structure */}
                    <Card style={{ visibility: 'hidden' }}>
                        <div className={styles.cardContent}>
                            <h3 className={styles.cardTitle}>&nbsp;</h3>
                            <p className={styles.cardDescription}>&nbsp;</p>
                        </div>
                    </Card>
                </div>
            </div>
            <p className={styles.footerText}>
                All payments are securely processed by Stripe. We do not store your payment information.
            </p>
        </Container>
    );
}

const PaymentsPage = () => {
    return (
        <Suspense fallback={
            <Container>
                <PageHeader title="Payments" />
                <p>Loading...</p>
            </Container>
        }>
            <PaymentsPageContent />
        </Suspense>
    );
};

export default PaymentsPage;