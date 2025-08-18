/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C047 - 2025-08-18 : Definitive and final version provided by user.
 * C046 - 2025-08-18 : (Failed attempt, reverted)
 * C045 - 2025-08-11 : (Failed attempt, reverted)
 * Last Modified: 2025-08-18
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive and final version of the payments page, based on the robust implementation provided by the user. It correctly handles all UI states (loading, error, retry), permanently fixes the client-side race condition, and correctly implements the full design.
 * Impact Analysis: This change brings the payments page to its final, stable, and production-ready state.
 * Dependencies: "@clerk/nextjs", "@/lib/utils/get-stripejs", "react-hot-toast", Radix UI, and VDL UI components.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

// NOTE: We are not using the CSS module as the user's code provides inline styles for clarity.

interface SavedCard {
    id: string;
    brand: string | undefined;
    last4: string | undefined;
    exp_month: number | undefined;
    exp_year: number | undefined;
}

const PaymentsPage = () => {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user || !isSignedIn) return;
        
        setIsLoading(true);
        setHasError(false);
        
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication session is not valid.");

            const headers = { 'Authorization': `Bearer ${token}` };

            const [accountRes, cardsRes] = await Promise.all([
                fetch('/api/stripe/get-connect-account', { headers }),
                fetch('/api/stripe/get-payment-methods', { headers })
            ]);

            if (!accountRes.ok) throw new Error('Failed to get Stripe connection status.');
            if (!cardsRes.ok) throw new Error('Could not fetch saved cards.');
            
            const accountData = await accountRes.json();
            const cardsData = await cardsRes.json();

            setStripeAccount(accountData.account);
            setSavedCards(cardsData.cards || []);
            setDefaultPaymentMethodId(cardsData.defaultPaymentMethodId);
        } catch (error) {
            setHasError(true);
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [user, isSignedIn, getToken]);

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn && user) {
                fetchData();
            } else {
                router.push('/sign-in');
            }
        }
    }, [isLoaded, isSignedIn, user, router, fetchData]);

    const handleConnectStripe = async () => {
        const toastId = toast.loading('Redirecting to Stripe...');
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication required.");

            const response = await fetch('/api/stripe/connect-account', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Could not get a connection URL.");
            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("No connection URL provided.");
            }
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to connect to Stripe.', { id: toastId });
        }
    };
    
    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your Stripe account? This cannot be undone.')) return;
        const toastId = toast.loading('Disconnecting Stripe account...');
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication required.");

            const response = await fetch('/api/stripe/disconnect-account', { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to disconnect account.");
            
            await user?.reload();
            await fetchData();
            toast.success('Stripe account disconnected.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', { id: toastId });
        }
    };

    const handleAddNewCard = async () => {
        const toastId = toast.loading('Redirecting to add new card...');
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication required.");

            const response = await fetch('/api/stripe/create-checkout-session', { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session.');
            }
            const { sessionId } = await response.json();
            const stripe = await getStripe();
            if (stripe && sessionId) {
                await stripe.redirectToCheckout({ sessionId });
            } else {
                throw new Error("Stripe.js failed to load or no session ID provided.");
            }
            toast.dismiss(toastId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
        }
    };

    const handleSetDefault = async (paymentMethodId: string) => {
        const toastId = toast.loading('Setting default payment method...');
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication required.");

            const response = await fetch('/api/stripe/set-default-card', { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ paymentMethodId }) 
            });
            if (!response.ok) throw new Error("Failed to set default payment method.");
            
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
            const token = await getToken();
            if (!token) throw new Error("Authentication required.");

            const response = await fetch('/api/stripe/remove-card', { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ paymentMethodId }) 
            });
            if (!response.ok) throw new Error("Failed to remove payment method.");
            
            setSavedCards(cards => cards.filter(c => c.id !== paymentMethodId));
            if (defaultPaymentMethodId === paymentMethodId) {
                setDefaultPaymentMethodId(null);
            }
            toast.success('Card removed successfully.', { id: toastId });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
        }
    };

    const handleRetry = () => {
        fetchData();
    };

    const formatCardBrand = (brand: string | undefined): string => {
        if (!brand) return 'CARD';
        return brand.toUpperCase();
    };

    const formatExpiry = (month: number | undefined, year: number | undefined): string => {
        if (!month || !year) return 'N/A';
        return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
    };

    if (!isLoaded || isLoading) {
        return (
            <Container>
                <PageHeader title="Payments" />
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '200px',
                    color: '#666'
                }}>
                    <p>Loading payment settings...</p>
                </div>
            </Container>
        );
    }

    if (hasError) {
        return (
            <Container>
                <PageHeader title="Payments" />
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    minHeight: '200px',
                    gap: '16px',
                    padding: '32px'
                }}>
                    <p style={{ color: '#dc2626', fontSize: '16px' }}>
                        Could not load your payment information.
                    </p>
                    <Button onClick={handleRetry} variant="secondary">
                        Try Again
                    </Button>
                </div>
            </Container>
        );
    }
    
    return (
        <Container>
            <PageHeader title="Payments" />
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '24px',
                padding: '24px 0'
            }}>
                {/* Sending Payment Methods */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Card>
                        <div style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                                Sending Payment Methods
                            </h3>
                            <p style={{ color: '#666', marginBottom: '16px' }}>
                                Add or manage your credit and debit cards.
                            </p>
                            <button
                                onClick={handleAddNewCard}
                                style={{
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Create New Card
                            </button>
                        </div>
                    </Card>

                    {savedCards.length > 0 && (
                        <Card>
                            <div style={{ padding: '24px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                                    Saved Cards
                                </h3>
                                <p style={{ color: '#666', marginBottom: '20px' }}>
                                    Set a default bank card or remove expired bank cards.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {savedCards.map(card => (
                                        <div key={card.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '16px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '24px',
                                                backgroundColor: '#f3f4f6',
                                                borderRadius: '4px',
                                                flexShrink: 0
                                            }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: '500' }}>
                                                        {formatCardBrand(card.brand)} **** **** **** {card.last4}
                                                    </span>
                                                    {card.id === defaultPaymentMethodId && (
                                                        <span style={{
                                                            fontSize: '12px',
                                                            backgroundColor: '#dcfce7',
                                                            color: '#166534',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontWeight: '500'
                                                        }}>
                                                            DEFAULT
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '14px', color: '#666' }}>
                                                    Expiration: {formatExpiry(card.exp_month, card.exp_year)}
                                                </span>
                                            </div>
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger asChild>
                                                    <button style={{
                                                        padding: '8px 16px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        color: '#374151',
                                                        backgroundColor: '#f9fafb',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}>
                                                        MANAGE
                                                    </button>
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Portal>
                                                    <DropdownMenu.Content 
                                                        style={{
                                                            backgroundColor: 'white',
                                                            border: '1px solid #e5e7eb',
                                                            borderRadius: '8px',
                                                            padding: '4px',
                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                            minWidth: '160px',
                                                            zIndex: 50
                                                        }}
                                                        sideOffset={5} 
                                                        align="end"
                                                    >
                                                        {card.id !== defaultPaymentMethodId && (
                                                            <DropdownMenu.Item 
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    fontSize: '14px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '4px',
                                                                    outline: 'none'
                                                                }}
                                                                onSelect={() => handleSetDefault(card.id)}
                                                            >
                                                                Set as default
                                                            </DropdownMenu.Item>
                                                        )}
                                                        <DropdownMenu.Item 
                                                            style={{
                                                                padding: '8px 12px',
                                                                fontSize: '14px',
                                                                cursor: 'pointer',
                                                                borderRadius: '4px',
                                                                color: '#dc2626',
                                                                outline: 'none'
                                                            }}
                                                            onSelect={() => handleRemove(card.id)}
                                                        >
                                                            Remove
                                                        </DropdownMenu.Item>
                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Portal>
                                            </DropdownMenu.Root>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}
                    
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#666', 
                        textAlign: 'center',
                        marginTop: '16px'
                    }}>
                        Your payment details are securely processed by Stripe. We do not retain your payment data.
                    </p>
                </div>

                {/* Receiving Payment Methods */}
                <div>
                    <Card>
                        <div style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                                Receiving Payment Methods
                            </h3>
                            <p style={{ color: '#666', marginBottom: '16px' }}>
                                Connect a Stripe account to receive your referral earnings and payouts.
                            </p>
                            {stripeAccount?.details_submitted ? (
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <button
                                        onClick={handleConnectStripe}
                                        style={{
                                            color: '#2563eb',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Manage
                                    </button>
                                    <button
                                        onClick={handleDisconnect}
                                        style={{
                                            color: '#dc2626',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectStripe}
                                    style={{
                                        color: '#2563eb',
                                        textDecoration: 'none',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Connect
                                </button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </Container>
    );
};

export default PaymentsPage;