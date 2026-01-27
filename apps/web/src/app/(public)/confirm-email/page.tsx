/*
 * Filename: src/app/(public)/confirm-email/page.tsx
 * Purpose: Client-side email confirmation handler that can access code_verifier
 *
 * This page handles email confirmation links. It must be client-side because
 * the PKCE code_verifier is stored in localStorage during signup and can only
 * be accessed in the browser where the signup occurred.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import Message from '@/app/components/ui/feedback/Message';
import Button from '@/app/components/ui/actions/Button';
import authStyles from '@/app/styles/auth.module.css';

function ConfirmEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleConfirmation = async () => {
      const code = searchParams?.get('code');
      const token_hash = searchParams?.get('token_hash');
      const type = searchParams?.get('type');
      const error = searchParams?.get('error');
      const error_description = searchParams?.get('error_description');

      console.log('[Confirm Email] Params:', {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        type,
        error,
        error_description
      });

      // Check for error in URL (from Supabase redirect)
      if (error) {
        setStatus('error');
        setErrorMessage(error_description || error);
        return;
      }

      // Handle PKCE code exchange (client-side has access to code_verifier in localStorage)
      if (code) {
        console.log('[Confirm Email] Exchanging code for session...');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('[Confirm Email] Code exchange error:', exchangeError.message);
          setStatus('error');
          setErrorMessage(exchangeError.message);
          return;
        }

        console.log('[Confirm Email] Code exchange successful');
        setStatus('success');

        // Redirect to onboarding after short delay
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);
        return;
      }

      // Handle token_hash verification (magic link style)
      if (token_hash && type) {
        console.log('[Confirm Email] Verifying OTP with token_hash...');
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
        });

        if (otpError) {
          console.error('[Confirm Email] OTP verification error:', otpError.message);
          setStatus('error');
          setErrorMessage(otpError.message);
          return;
        }

        console.log('[Confirm Email] OTP verification successful');
        setStatus('success');

        // Redirect to onboarding after short delay
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);
        return;
      }

      // No valid params - check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[Confirm Email] User already has session');
        setStatus('success');
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);
        return;
      }

      // No valid parameters and no session
      setStatus('error');
      setErrorMessage('No valid confirmation parameters found. The link may have expired.');
    };

    handleConfirmation();
  }, [searchParams, supabase.auth, router]);

  if (status === 'loading') {
    return (
      <Container variant="form">
        <PageHeader title="Confirming Your Email" subtitle="Please wait..." />
        <div className={authStyles.authCard}>
          <p style={{ textAlign: 'center', color: '#666' }}>
            Verifying your email address...
          </p>
        </div>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container variant="form">
        <PageHeader title="Email Confirmation Failed" subtitle="We couldn't verify your email" />
        <div className={authStyles.authCard}>
          <Message type="error">
            {errorMessage || 'The confirmation link is invalid or has expired.'}
          </Message>
          <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
            This can happen if:
          </p>
          <ul style={{ color: '#666', fontSize: '0.9rem', marginLeft: '1.5rem' }}>
            <li>You clicked the link from a different browser or device</li>
            <li>The link has expired (links are valid for 24 hours)</li>
            <li>You've already confirmed your email</li>
          </ul>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <Button variant="primary" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
            <Button variant="secondary" onClick={() => router.push('/signup')}>
              Sign Up Again
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container variant="form">
      <PageHeader title="Email Confirmed!" subtitle="Your account is ready" />
      <div className={authStyles.authCard}>
        <Message type="success">
          Your email has been verified successfully. Redirecting to onboarding...
        </Message>
      </div>
    </Container>
  );
}

function LoadingFallback() {
  return (
    <Container variant="form">
      <PageHeader title="Confirming Your Email" subtitle="Please wait..." />
      <div className={authStyles.authCard}>
        <p style={{ textAlign: 'center', color: '#666' }}>Loading...</p>
      </div>
    </Container>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
