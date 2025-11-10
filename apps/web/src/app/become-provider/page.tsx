'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
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
  const { profile, isLoading: isProfileLoading, user } = useUserProfile();
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isProfileLoading && !profile) {
      router.push('/login');
    }
  }, [isProfileLoading, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

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

  if (isProfileLoading || !profile) {
    return <Container><p>Loading...</p></Container>;
  }
  
  if (profile.roles?.includes('tutor')) {
    return (
        <Container className={styles.container}>
            <PageHeader title="You're Already a Tutor!" />
            <Message type='success'>Your tutor account is active. You can manage your settings from the payments page.</Message>
            <Link href="/payments"><Button>Go to Payment Settings</Button></Link>
        </Container>
    )
  }

  return (
    <Container className={styles.container}>
      <PageHeader
        title="Become a Tutorwise Provider"
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