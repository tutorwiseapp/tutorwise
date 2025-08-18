/*
 * Filename: src/app/payments/page.tsx
 * Purpose: Allows users to manage their methods for sending and receiving payments.
 * Change History:
 * C038 - 2025-08-10 : 22:00 - Definitive fix for "Saved Cards" UI layout and styling.
 * C037 - 2025-08-10 : 21:00 - Definitive and final version combining user's robust UI with the definitive getToken() fix.
 * C036 - 2025-08-10 : 20:00 - (User-provided robust implementation)
 * Last Modified: 2025-08-10 : 22:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive and final fix for the UI of the "Saved Cards" section. The "feature unavailable" state is now correctly wrapped in a <Card> component to match the page's design system. The retry button has also been correctly styled as a VDL link.
 * Impact Analysis: This change brings the payments page to its final, visually polished state.
 * Dependencies: "@clerk/nextjs", "@/lib/utils/get-stripejs", "react-hot-toast", and VDL UI components.
 */
'use client';

// ... (all imports and state definitions remain exactly the same)
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
import styles from './page.module.css';

interface SavedCard { /* ... */ }

const PaymentsPage = () => {
    // ... (all state and functions remain exactly the same)
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const [stripeAccount, setStripeAccount] = useState<{ details_submitted: boolean } | null>(null);
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cardsFeatureEnabled, setCardsFeatureEnabled] = useState(true);

    const fetchData = useCallback(async () => { /* ... */ }, [user, isSignedIn, getToken, cardsFeatureEnabled]);
    useEffect(() => { /* ... */ }, [isLoaded, isSignedIn, user, router, fetchData]);

    const handleConnect = async () => { /* ... */ };
    const handleDisconnect = async () => { /* ... */ };
    const handleAddNewCard = async () => { /* ... */ };
    const handleSetDefault = async (paymentMethodId: string) => { /* ... */ };
    const handleRemove = async (paymentMethodId: string) => { /* ... */ };
    
    const handleTryEnableCards = () => {
        setCardsFeatureEnabled(true);
        // The useEffect will trigger the fetchData call.
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

                    {/* --- THIS IS THE DEFINITIVE FIX --- */}
                    {cardsFeatureEnabled ? (
                        savedCards.length > 0 && (
                            <div className={styles.savedCardsSection}>
                                <h3 className={styles.sectionTitle}>Saved Cards</h3>
                                <p className={styles.cardDescription}>Set a default bank card or remove expired bank cards.</p>
                                {savedCards.map(card => (
                                    <Card key={card.id} className={styles.savedCard}>
                                        {/* ... card details JSX ... */}
                                    </Card>
                                ))}
                            </div>
                        )
                    ) : (
                        <Card>
                            <h3 className={styles.cardTitle}>Saved Cards</h3>
                             <p className={styles.cardDescription}>Saved cards feature is temporarily unavailable.</p>
                             <a href="#" onClick={(e) => { e.preventDefault(); handleTryEnableCards(); }} className={styles.cardLink}>
                                Try Loading Saved Cards
                            </a>
                        </Card>
                    )}
                    {/* --- END OF FIX --- */}
                     
                     <p className={styles.footerText}>Your payment details are securely processed by Stripe. We do not retain your payment data.</p>
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