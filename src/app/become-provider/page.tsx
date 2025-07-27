/*
 * Filename: src/app/become-provider/page.tsx
 * Purpose: Allows authenticated users to apply to become a Vinite provider.
 * Change History:
 * C001 - 2025-07-27 : 12:00 - Replaced `useAuth` with Clerk's `useUser` hook.
 * Last Modified: 2025-07-27 : 12:00
 * Requirement ID (optional): VIN-A-005
 * Change Summary: This is the definitive fix for the `AuthProvider` issue. The old `useAuth`
 * hook has been surgically replaced with `useUser` from Clerk. The role-checking logic was
 * updated to read from `user.publicMetadata.role`. A standard `useEffect` hook has also
 * been added to protect the route and handle loading states.
 * Impact Analysis: This change completes the migration of the become-provider page to the Clerk
 * authentication system, making it functional and secure while preserving all existing logic.
 * Dependencies: "@clerk/nextjs", "next/navigation", "next/link", and VDL UI components.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

// VDL Component Imports (Preserved)
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Textarea from '@/app/components/ui/form/Textarea';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import styles from './page.module.css';

const BecomeProviderPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Your existing state management is preserved
  const [businessName, setBusinessName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // This effect protects the route, ensuring only logged-in users can see it.
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Your existing submit handler is preserved
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // This is where you would call your API endpoint
    // The simulated logic is preserved
    setTimeout(() => {
        console.log({
            userId: user?.id,
            businessName,
            serviceDescription,
        });
        setIsLoading(false);
        setMessage({ text: 'Congratulations! Your application has been received. Redirecting...', type: 'success' });
        // In a real app, you would also trigger a webhook to update the user's role
        setTimeout(() => router.push('/dashboard'), 2000);
    }, 1500);
  };

  // While Clerk is loading the user session, we show a loading state.
  if (!isLoaded || !user) {
    return <Container><p>Loading...</p></Container>;
  }

  // The role check is now based on Clerk's publicMetadata
  if ((user.publicMetadata?.role as string) === 'provider') {
    return (
        <Container className={styles.container}>
            <PageHeader title="You're Already a Provider!" />
            <Message type='success'>Your provider account is active. You can manage your settings from the payments page.</Message>
            <Link href="/payments"><Button>Go to Payment Settings</Button></Link>
        </Container>
    )
  }

  // The rest of your component's JSX is preserved exactly as it was.
  return (
    <Container className={styles.container}>
      <PageHeader
        title="Become a Vinite Provider"
        subtitle="Fill out your details below to start accepting referrals for your service."
      />
      <Card>
        {message && <Message type={message.type}>{message.text}</Message>}
        <form onSubmit={handleSubmit}>
          <FormGroup label="Business or Service Name" htmlFor="businessName">
            <Input id="businessName" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
          </FormGroup>
          <FormGroup label="Service Description" htmlFor="serviceDescription">
            <Textarea id="serviceDescription" value={serviceDescription} onChange={e => setServiceDescription(e.target.value)} rows={4} required />
          </FormGroup>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default BecomeProviderPage;