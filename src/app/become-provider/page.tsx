/*
 * Filename: src/app/become-provider/page.tsx
 * Purpose: Allows authenticated users to apply to become a Vinite provider, migrated to Kinde.
 * Change History:
 * C002 - 2025-08-26 : 14:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C001 - 2025-07-27 : 12:00 - Replaced useAuth with Clerk's useUser hook.
 * Last Modified: 2025-08-26 : 14:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been migrated from Clerk to Kinde. The `useUser` hook was replaced with `useKindeBrowserClient`. The route is now protected by checking the `isAuthenticated` flag from Kinde. The previous role-checking logic, which depended on Clerk's `publicMetadata`, has been removed to resolve the build error. Role-specific UI will be handled by fetching profile data from our own backend in a future step.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---

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
  const { user, isAuthenticated, isLoading: isKindeLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isKindeLoading && !isAuthenticated) {
      router.push('/api/auth/login'); // --- THIS IS THE FIX: Redirect via Kinde's route ---
    }
  }, [isKindeLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // This is where you would call your API endpoint
    setTimeout(() => {
        console.log({
            userId: user?.id,
            businessName,
            serviceDescription,
        });
        setIsLoading(false);
        setMessage({ text: 'Congratulations! Your application has been received. Redirecting...', type: 'success' });
        setTimeout(() => router.push('/dashboard'), 2000);
    }, 1500);
  };

  if (isKindeLoading || !isAuthenticated) {
    return <Container><p>Loading...</p></Container>;
  }

  // NOTE: Role-based logic is simplified. A more robust check would involve fetching the user's
  // profile from your own database to get their role.
  // if ((user.publicMetadata?.role as string) === 'provider') {
  //   return (
  //       <Container className={styles.container}>
  //           <PageHeader title="You're Already a Provider!" />
  //           <Message type='success'>Your provider account is active. You can manage your settings from the payments page.</Message>
  //           <Link href="/payments"><Button>Go to Payment Settings</Button></Link>
  //       </Container>
  //   )
  // }

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