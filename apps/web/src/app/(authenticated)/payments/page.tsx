/*
 * Filename: src/app/(authenticated)/payments/page.tsx
 * Purpose: Payment methods management with 3-column dashboard layout
 * Created: 2025-09-01
 * Updated: 2025-11-13 - Migrated to React Query for robustness and consistency
 * Specification: Hub page with AppSidebar, main content, and ContextualSidebar
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import {
  getPaymentData,
  setDefaultCard,
  removeCard,
  connectStripeAccount,
  disconnectStripeAccount,
  createCheckoutSession,
  verifyAndGetCards,
  type SavedCard,
} from '@/lib/api/payments';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import Card from '@/app/components/ui/Card';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import styles from './page.module.css';

const PaymentsPageContent = () => {
    const { profile, isLoading: isProfileLoading } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [isVerifying, setIsVerifying] = useState(false);

    // React Query: Fetch payment data (account + cards)
    const {
        data: paymentData,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['payments', profile?.id, profile?.stripe_customer_id],
        queryFn: () => getPaymentData(profile?.stripe_customer_id),
        enabled: !!profile && !isProfileLoading,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
    });

    const stripeAccount = paymentData?.account ?? null;
    const savedCards = paymentData?.cards ?? [];
    const defaultPaymentMethodId = paymentData?.defaultPaymentMethodId ?? null;

    // Mutation: Set default card
    const setDefaultMutation = useMutation({
        mutationFn: setDefaultCard,
        onSuccess: (_, paymentMethodId) => {
            queryClient.setQueryData(
                ['payments', profile?.id, profile?.stripe_customer_id],
                (old: any) => ({
                    ...old,
                    defaultPaymentMethodId: paymentMethodId,
                })
            );
            toast.success('Default payment method updated');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
        },
    });

    // Mutation: Remove card
    const removeCardMutation = useMutation({
        mutationFn: removeCard,
        onSuccess: (_, paymentMethodId) => {
            queryClient.setQueryData(
                ['payments', profile?.id, profile?.stripe_customer_id],
                (old: any) => ({
                    ...old,
                    cards: old.cards.filter((card: SavedCard) => card.id !== paymentMethodId),
                })
            );
            toast.success('Card removed successfully');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
        },
    });

    // Mutation: Disconnect Stripe account
    const disconnectMutation = useMutation({
        mutationFn: disconnectStripeAccount,
        onSuccess: () => {
            queryClient.setQueryData(
                ['payments', profile?.id, profile?.stripe_customer_id],
                (old: any) => ({
                    ...old,
                    account: null,
                })
            );
            toast.success('Stripe account disconnected');
        },
        onError: (error) => {
            toast.error(getErrorMessage(error));
        },
    });

    // Enhanced verification polling with better error handling
    useEffect(() => {
        const status = searchParams?.get('status');
        const customerId = searchParams?.get('customer_id');

        if (status === 'success' && customerId && !isVerifying) {
            setIsVerifying(true);
            const toastId = toast.loading('Verifying your new card...');
            let attempts = 0;
            const maxAttempts = 6;
            const initialCardCount = savedCards.length;

            const pollForNewCard = async () => {
                try {
                    const data = await verifyAndGetCards(customerId);
                    const newCards = data.cards || [];

                    if (newCards.length > initialCardCount) {
                        queryClient.setQueryData(
                            ['payments', profile?.id, profile?.stripe_customer_id],
                            (old: any) => ({
                                ...old,
                                cards: newCards,
                                defaultPaymentMethodId: data.defaultPaymentMethodId,
                            })
                        );
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
                    toast.error('Card verification timed out. Please refresh to see your new card.', { id: toastId });
                    router.replace('/payments', { scroll: false });
                    setIsVerifying(false);
                    setTimeout(() => refetch(), 1000);
                }
            }, 2000);

            return () => clearInterval(poll);
        }
    }, [searchParams, isVerifying, router, savedCards.length, refetch, queryClient, profile]);

    const handleConnectStripe = async (e: React.MouseEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const url = await connectStripeAccount();
            window.location.href = url;
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(getErrorMessage(error), { id: toastId });
        }
    };

    const handleDisconnect = async (e: React.MouseEvent) => {
        e.preventDefault();
        disconnectMutation.mutate();
    };

    const handleSetDefault = async (paymentMethodId: string) => {
        setDefaultMutation.mutate(paymentMethodId);
    };

    const handleRemove = async (paymentMethodId: string) => {
        removeCardMutation.mutate(paymentMethodId);
    };

    const handleAddNewCard = async (e: React.MouseEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const sessionId = await createCheckoutSession();
            const stripe = await getStripe();

            if (!stripe) {
                throw new Error('Stripe.js failed to load');
            }

            await stripe.redirectToCheckout({ sessionId });
            toast.dismiss(toastId);
        } catch (error) {
            console.error('Add card error:', error);
            toast.error(getErrorMessage(error), { id: toastId });
        }
    };

    const handleRefreshCards = async () => {
        await refetch();
        toast.success('Card data refreshed');
    };

    // Redirect if not logged in
    useEffect(() => {
        if (!isProfileLoading && !profile) {
            router.push('/login');
        }
    }, [isProfileLoading, profile, router]);

    if (isProfileLoading || isLoading) {
        return (
            <>
              <div className={styles.loading}>Loading payment methods...</div>
              <ContextualSidebar>
                <div className={styles.skeletonWidget} />
              </ContextualSidebar>
            </>
        );
    }

    if (error) {
        return (
            <>
              <div className={styles.error}>Failed to load payment data. Please try again.</div>
              <ContextualSidebar>
                <div className={styles.skeletonWidget} />
              </ContextualSidebar>
            </>
        );
    }

    return (
        <>
            {/* Page Header */}
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Payment Settings</h1>
                    <p className={styles.subtitle}>Manage your methods for sending and receiving payments.</p>
                </div>

                {/* Settings Tab */}
                <div className={styles.filterTabs}>
                    <button className={`${styles.filterTab} ${styles.filterTabActive}`}>
                        Settings
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.content}>
                <div className={styles.grid}>
                    <div className={styles.columnStack}>
                        <Card>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>Sending Payment Methods</h3>
                                <p className={styles.cardDescription}>Add or manage your credit and debit cards.</p>
                                <div className={styles.cardActions}>
                                   <a href="#" onClick={handleAddNewCard} className={styles.cardLink}>Add a New Card</a>
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3 className={styles.cardTitle}>Saved Cards</h3>
                                        <p className={styles.cardDescription}>
                                            Set a default card or remove expired ones.
                                        </p>
                                    </div>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleRefreshCards(); }} className={styles.cardLink}>
                                        Refresh
                                    </a>
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
                        </Card>
                    </div>
                    <div className={styles.columnStack}>
                        <Card>
                             <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>Receiving Payment Methods</h3>
                                <p className={styles.cardDescription}>Connect a Stripe account to receive your referral earnings.</p>
                                <div className={styles.cardActions}>
                                     <a href="#" onClick={handleConnectStripe} className={styles.cardLink}>
                                        {stripeAccount?.details_submitted ? 'Manage Stripe Account' : 'Connect Stripe Account'}
                                    </a>
                                    {stripeAccount?.details_submitted && (
                                        <a href="#" onClick={handleDisconnect} className={`${styles.cardLink} ${styles.disconnect}`}>
                                            Disconnect
                                        </a>
                                    )}
                                </div>
                            </div>
                        </Card>
                        {/* Hidden spacer card to balance column heights */}
                        <div style={{ visibility: 'hidden', pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
                            <Card>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitle}>Spacer</h3>
                                    <p className={styles.cardDescription}>Hidden spacer card</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contextual Sidebar (Right Column) */}
            <ContextualSidebar>
                <div className={styles.sidebarCard}>
                    <h3 className={styles.sidebarTitle}>Payment Help</h3>
                    <p className={styles.sidebarText}>
                        All payments are processed securely through Stripe.
                    </p>
                    <p className={styles.sidebarText}>
                        For payment issues, contact our support team.
                    </p>
                </div>
            </ContextualSidebar>
        </>
    );
}

const PaymentsPage = () => {
    return (
        <Suspense fallback={
            <>
                <div className={styles.loading}>Loading...</div>
                <ContextualSidebar>
                    <div className={styles.skeletonWidget} />
                </ContextualSidebar>
            </>
        }>
            <PaymentsPageContent />
        </Suspense>
    );
};

export default PaymentsPage;
