'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // --- FIX: Missing Link import is added
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Textarea from '@/app/components/ui/form/Textarea';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import { useAuth } from '@/app/components/auth/AuthProvider';
import styles from './page.module.css'; // --- FIX: Stylesheet is imported

const BecomeProviderPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // This is where you would call your API endpoint
    // For now, we simulate success with a setTimeout
    setTimeout(() => {
        console.log({
            userId: user?.id,
            businessName,
            serviceDescription,
        });
        setIsLoading(false);
        setMessage({ text: 'Congratulations! You are now a provider. Redirecting...', type: 'success' });
        // In a real app, you would also update the user object in AuthContext here
        setTimeout(() => router.push('/dashboard'), 2000);
    }, 1500);
  };

  if (user?.roles?.includes('provider')) {
    return (
        <Container className={styles.container}>
            <PageHeader title="You're Already a Provider!" />
            <Message type='success'>Your provider account is active. You can manage your settings from the payments page.</Message>
            <Link href="/payments"><Button>Go to Payment Settings</Button></Link>
        </Container>
    )
  }

  return (
    // --- FIX: Using className instead of inline style ---
    <Container className={styles.container}>
      <PageHeader
        title="Become a Vinite Provider"
        // --- FIX: Using HTML entity for the apostrophe ---
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