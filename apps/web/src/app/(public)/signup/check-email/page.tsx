/*
 * Filename: src/app/(public)/signup/check-email/page.tsx
 * Purpose: Post-signup confirmation page with resend email functionality
 * Created: 2026-01-28
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/actions/Button';
import Message from '@/app/components/ui/feedback/Message';

const RESEND_COOLDOWN_SECONDS = 60;

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    document.title = 'Check Your Email - Tutorwise';
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (!email || cooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) {
        // Handle rate limiting from Supabase
        if (resendError.message.includes('rate') || resendError.message.includes('limit')) {
          setError('Too many requests. Please wait a few minutes before trying again.');
        } else {
          setError(resendError.message);
        }
      } else {
        setMessage('Confirmation email sent! Please check your inbox.');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err) {
      console.error('Resend email error:', err);
      setError('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Mask email for privacy (show first 2 chars and domain)
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3')
    : 'your email';

  return (
    <Container variant="form">
      <PageHeader
        title="Check Your Email"
        subtitle="We've sent a confirmation link to verify your account"
      />
      <div className={authStyles.authCard}>
        {message && <Message type="success">{message}</Message>}
        {error && <Message type="error">{error}</Message>}

        <div className={authStyles.checkEmailContent}>
          <div className={authStyles.emailIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <p className={authStyles.checkEmailText}>
            We've sent a confirmation email to <strong>{maskedEmail}</strong>.
            Click the link in the email to activate your account.
          </p>

          <div className={authStyles.checkEmailTips}>
            <p><strong>Didn't receive the email?</strong></p>
            <ul>
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes and check again</li>
            </ul>
          </div>

          <div className={authStyles.checkEmailActions}>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleResendEmail}
              disabled={cooldown > 0 || isResending || !email}
            >
              {isResending
                ? 'Sending...'
                : cooldown > 0
                  ? `Resend email (${cooldown}s)`
                  : 'Resend confirmation email'}
            </Button>

            <Link href="/signup" className={authStyles.checkEmailLink}>
              Use a different email address
            </Link>
          </div>
        </div>
      </div>

      <div className={authStyles.authSwitch}>
        Already verified? <Link href="/login">Log In</Link>
      </div>
    </Container>
  );
}

// Loading fallback for Suspense
function CheckEmailLoading() {
  return (
    <Container variant="form">
      <PageHeader
        title="Check Your Email"
        subtitle="Loading..."
      />
      <div className={authStyles.authCard}>
        <div className={authStyles.checkEmailContent}>
          <div className={authStyles.emailIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <p className={authStyles.checkEmailText}>Loading...</p>
        </div>
      </div>
    </Container>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckEmailLoading />}>
      <CheckEmailContent />
    </Suspense>
  );
}
