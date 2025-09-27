'use client';

import { useState } from 'react';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <Container variant="form">
      <PageHeader title="Forgot Password" subtitle="Enter your email to receive a reset link." />
      <Card>
        {isSubmitted ? (
          <Message type="success">
            <strong>Check your email:</strong> If an account exists for {email}, a reset link has been sent.
          </Message>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormGroup label="Your Email Address" htmlFor="email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </FormGroup>
            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}
      </Card>
    </Container>
  );
};
export default ForgotPasswordPage;