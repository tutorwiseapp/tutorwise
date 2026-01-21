'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import Input from '@/app/components/ui/forms/Input';
import Button from '@/app/components/ui/actions/Button';
import Message from '@/app/components/ui/feedback/Message';
import authStyles from '@/app/styles/auth.module.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Container variant="form">
      <PageHeader title="Forgot Password" subtitle="Enter your email to receive a reset link." />
      <div className={authStyles.authCard}>
        {error && <Message type="error">{error}</Message>}
        {isSubmitted ? (
          <Message type="success">
            <strong>Check your email:</strong> If an account exists for {email}, a reset link has been sent.
          </Message>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormGroup label="Your Email Address" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ fontSize: '16px' }}
                required
                disabled={isLoading}
              />
            </FormGroup>
            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}
      </div>
    </Container>
  );
};
export default ForgotPasswordPage;