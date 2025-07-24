'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js'; // For redirecting to checkout

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/removeAuthProvider';
import styles from './page.module.css';

// MOCK DATA - In a real app, this would be fetched from your database
const mockStripeConnection = { isConnected: false, email: '' };
const mockSavedCards = [ { id: 'card_1', brand: 'Visa', last4: '4242', isDefault: true } ];

// Reusable Sub-component for displaying a saved card
const CreditCardDisplay = ({ brand, last4, isDefault }: { brand: string, last4:string, isDefault:boolean }) => (
    <div className={styles.cardDisplay}>
        <div>
            <span style={{ fontWeight: 600 }}>{brand}</span> ending in {last4}
        </div>
        {isDefault && <span className={styles.defaultBadge}>Default</span>}
    </div>
);

const PaymentsPage = () => {
  const { user } = useAuth();
  
  // In a real app, this state would be derived from a database call
  const [stripeConnection, setStripeConnection] = useState(mockStripeConnection);
  const [isLoading, setIsLoading] = useState(false);
  const [savedCards] = useState(mockSavedCards);

  // --- UPDATED --- This now contains real logic to call the backend API
  const handleConnectStripe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/connect-account');
      const { url } = await response.json();

      if (url) {
        window.location.href = url; // Redirect user to Stripe onboarding
      } else {
        alert('Could not create a Stripe connection link. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to connect to Stripe:', error);
      alert('An error occurred while trying to connect to Stripe.');
      setIsLoading(false);
    }
  };
  
  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your Stripe account?')) {
        setStripeConnection({ isConnected: false, email: '' });
        // In a real app, you would also make an API call here to update the user's status
    }
  };

  // --- UPDATED --- This now contains real logic to call the backend API
  const handleAddCard = async () => {
    try {
        const response = await fetch('/api/stripe/create-checkout-session');
        const { sessionId } = await response.json();

        if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
            throw new Error("Stripe publishable key is not set.");
        }

        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        if (stripe) {
            await stripe.redirectToCheckout({ sessionId });
        }
    } catch (error) {
        console.error('Failed to add card:', error);
        alert('Could not start the process to add a new card.');
    }
  };
  
  // Role checks based on the authenticated user
  const isAgent = user?.roles?.includes('agent');
  const isSeeker = user?.roles?.includes('seeker');
  const isProvider = user?.roles?.includes('provider');

  return (
    <Container>
      <PageHeader title="Payment Settings" subtitle="Manage how you send and receive payments."/>
      
      {isAgent && (
        <Card className={styles.card}>
          <h3 className={styles.sectionHeader}>Receive Payouts</h3>
          {stripeConnection.isConnected ? (
            <div>
              <Message type="success">Your Stripe account is connected and ready to receive commissions.</Message>
              <p><strong>Connected Account:</strong> {stripeConnection.email}</p>
              <Button onClick={handleDisconnect} variant="secondary" style={{borderColor: 'var(--color-error)', color: 'var(--color-error)'}}>Disconnect Stripe</Button>
            </div>
          ) : (
            <div>
              <p>To receive your referral commissions, connect a Stripe account. Vinite uses Stripe for secure payouts.</p>
              <Button onClick={handleConnectStripe} disabled={isLoading} variant="primary" style={{ marginTop: '1.5rem' }}>
                {isLoading ? 'Connecting...' : 'Connect with Stripe'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {isProvider && (
        <>
          <Card className={styles.card}>
            <h3 className={styles.sectionHeader}>Receive Payments from Seekers</h3>
            <p>Connect a Stripe account to receive payments directly from customers for your services or products.</p>
            <Button variant="primary" style={{ marginTop: '1.5rem' }}>Connect Stripe to Get Paid</Button>
          </Card>
          <Card className={styles.card}>
            <h3 className={styles.sectionHeader}>Fund Commission Payouts</h3>
            <p>Add a bank card to pay referral commissions to Agents and platform fees to Vinite.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
              {savedCards.map(card => <CreditCardDisplay key={card.id} {...card} />)}
            </div>
            {/* --- FIX --- onClick handler is now correctly attached */}
            <Button onClick={handleAddCard} variant="secondary">Add New Card</Button>
          </Card>
        </>
      )}

      {isSeeker && (
        <Card className={styles.card}>
          <h3 className={styles.sectionHeader}>Your Payment Methods</h3>
          <p>Manage the credit and debit cards you use to pay Providers.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
            {savedCards.map(card => <CreditCardDisplay key={card.id} {...card} />)}
          </div>
          {/* --- FIX --- onClick handler is now correctly attached */}
          <Button onClick={handleAddCard} variant="secondary">Add New Card</Button>
        </Card>
      )}

      {(isAgent || isProvider || isSeeker) && (
        <Card className={styles.card}>
          <h3 className={styles.sectionHeader}>Financial History</h3>
          <p>Review your detailed financial records.</p>
          <div className={styles.buttonGroup}>
              <Link href="/referral-activities"><Button variant="secondary">View Referral Activity</Button></Link>
              <Link href="/transaction-history"><Button variant="secondary">View Transaction History</Button></Link>
          </div>
        </Card>
      )}

      {!isAgent && !isProvider && !isSeeker && <Message type='warning'>Payment settings are available for Agent, Seeker, and Provider accounts.</Message>}
    </Container>
  );
};
export default PaymentsPage;