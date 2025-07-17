'use client';

import { useState } from 'react';
import Link from 'next/link';
// import type { User } from '@/types'; // --- THIS IS THE FIX --- Unused import removed.

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/AuthProvider';
import styles from './page.module.css';

// MOCK DATA
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
  
  const [stripeConnection, setStripeConnection] = useState(mockStripeConnection);
  const [isLoading, setIsLoading] = useState(false);
  const [savedCards] = useState(mockSavedCards);

  const handleConnectStripe = () => {
    setIsLoading(true);
    setTimeout(() => {
      setStripeConnection({ isConnected: true, email: user?.email || '' });
      setIsLoading(false);
    }, 1500);
  };
  
  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your Stripe account?')) {
        setStripeConnection({ isConnected: false, email: '' });
    }
  };

  const handleAddCard = () => { alert('Simulating Add New Card flow...'); };
  
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