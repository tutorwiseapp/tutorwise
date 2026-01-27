/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user sign-up page with a Supabase-native form.
 * Change History:
 * C003 - 2025-09-02 : 16:00 - Rebuilt with a stateful form for Supabase Auth.
 * Last Modified: 2025-09-25 : 21:00 - Added metadata and name attributes for E2E testing
 * Requirement ID: VIN-AUTH-MIG-04
 * Change Summary: This page has been migrated from Kinde to Supabase Auth. It now contains a stateful form that uses the Supabase Browser Client to handle user registration via email/password and Google OAuth.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import authStyles from '@/app/styles/auth.module.css';
import Button from '@/app/components/ui/actions/Button';
import Input from '@/app/components/ui/forms/Input';
import FormGroup from '@/app/components/ui/forms/FormGroup';
import Message from '@/app/components/ui/feedback/Message';

// Password strength calculation helper
const calculatePasswordStrength = (password: string) => {
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  // Calculate strength score
  if (checks.length) strength += 20;
  if (checks.uppercase) strength += 20;
  if (checks.lowercase) strength += 20;
  if (checks.number) strength += 20;
  if (checks.special) strength += 20;

  // Determine label
  let label = 'Weak';
  let color = '#ef4444'; // red
  if (strength >= 80) {
    label = 'Strong';
    color = '#10b981'; // green
  } else if (strength >= 60) {
    label = 'Medium';
    color = '#f59e0b'; // orange
  }

  return { strength, label, color, checks };
};

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Calculate password strength
  const passwordStrength = password ? calculatePasswordStrength(password) : null;

  // Email validation
  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError(null);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError(null);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  useEffect(() => {
    document.title = 'Sign Up - Tutorwise';

    // Check for referral cookie (HMAC-signed format: referral_id.signature)
    const cookies = document.cookie.split(';');
    const referralCookie = cookies.find(cookie => cookie.trim().startsWith('tutorwise_referral_id='));
    if (referralCookie) {
      const cookieValue = referralCookie.split('=')[1];
      // Store the signed cookie value (will be validated server-side)
      sessionStorage.setItem('pending_referral_cookie', cookieValue);
    }

    // Pre-fill referral code from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const urlReferralCode = urlParams.get('ref');
    if (urlReferralCode) {
      setReferralCode(urlReferralCode);
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Validate terms acceptance
    if (!acceptedTerms) {
      setError('You must accept the Terms & Conditions to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      // Build metadata with hierarchical attribution support
      const metadata: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
      };

      // Hierarchical attribution priority (handled by database trigger):
      // 1. URL parameter (referral_code_url) - highest priority
      // 2. Cookie (referral_cookie_id + referral_cookie_secret) - medium priority
      // 3. Manual entry (referral_code_manual) - lowest priority

      // Add URL parameter if present (Priority 1)
      const urlParams = new URLSearchParams(window.location.search);
      const urlReferralCode = urlParams.get('ref');
      if (urlReferralCode) {
        metadata.referral_code_url = urlReferralCode;
      }

      // Add cookie if present (Priority 2)
      const pendingCookie = sessionStorage.getItem('pending_referral_cookie');
      if (pendingCookie) {
        metadata.referral_cookie_id = pendingCookie;
        // Cookie secret is validated server-side via trigger
        metadata.referral_cookie_secret = process.env.NEXT_PUBLIC_REFERRAL_COOKIE_SECRET || '';
        sessionStorage.removeItem('pending_referral_cookie');
      }

      // Add manual entry if present (Priority 3)
      if (referralCode) {
        metadata.referral_code_manual = referralCode;
      }

      // Use NEXT_PUBLIC_BASE_URL for consistent domain (avoids www vs non-www issues)
      const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || location.origin;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Redirect directly to onboarding - Supabase establishes session before redirect
          emailRedirectTo: `${siteUrl}/onboarding`,
          data: metadata,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      console.log('Signup response:', { data, hasSession: !!data.session, hasUser: !!data.user });

      // If we have a session, user is auto-logged in
      if (data.session) {
        console.log('Session created, redirecting to onboarding...');
        router.push('/onboarding');
      } else if (data.user && !data.user.email_confirmed_at) {
        // Email confirmation is enabled
        setMessage("Check your email for a confirmation link!");
        setIsLoading(false);
      } else {
        // Edge case: user created but no session yet
        setMessage("Account created! Redirecting...");
        setTimeout(() => {
          router.push('/login?message=Please log in with your new account');
        }, 1500);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    // Build metadata for Google OAuth signup
    const metadata: Record<string, any> = {};

    // Hierarchical attribution for OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const urlReferralCode = urlParams.get('ref');
    if (urlReferralCode) {
      metadata.referral_code_url = urlReferralCode;
    }

    const pendingCookie = sessionStorage.getItem('pending_referral_cookie');
    if (pendingCookie) {
      metadata.referral_cookie_id = pendingCookie;
      metadata.referral_cookie_secret = process.env.NEXT_PUBLIC_REFERRAL_COOKIE_SECRET || '';
      sessionStorage.removeItem('pending_referral_cookie');
    }

    if (referralCode) {
      metadata.referral_code_manual = referralCode;
    }

    // Use NEXT_PUBLIC_BASE_URL for consistent domain (avoids www vs non-www issues)
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || location.origin;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
        // Pass metadata to OAuth flow (will be available in callback)
        ...(Object.keys(metadata).length > 0 && {
          data: metadata
        }),
      },
    });
  };

  return (
    <Container variant="form">
      <PageHeader
        title="Create Your Account"
        subtitle="Join Tutorwise Free: Start Tutoring Now!"
      />
      <div className={authStyles.authCard}>
        {message && <Message type="success">{message}</Message>}
        {error && <Message type="error">{error}</Message>}
        <form onSubmit={handleSignUp}>
          <div className={authStyles.twoColGrid}>
            <FormGroup label="First Name" htmlFor="firstName">
              <Input
                id="firstName"
                name="given-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                style={{ fontSize: '16px' }}
                required
              />
            </FormGroup>
            <FormGroup label="Last Name" htmlFor="lastName">
              <Input
                id="lastName"
                name="family-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                style={{ fontSize: '16px' }}
                required
              />
            </FormGroup>
          </div>
          <FormGroup label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="johnsmith@gmail.com"
              style={{ fontSize: '16px' }}
              required
            />
            {emailError && (
              <div className={authStyles.inlineError}>
                {emailError}
              </div>
            )}
          </FormGroup>
          <FormGroup label="Password" htmlFor="password">
            <div className={authStyles.passwordInputWrapper}>
              <Input
                id="password"
                name="new-password"
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontSize: '16px', paddingRight: '60px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={authStyles.togglePasswordButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {/* Password Strength Indicator */}
            {password && passwordStrength && (
              <div className={authStyles.passwordStrength}>
                <div className={authStyles.strengthHeader}>
                  <span className={authStyles.strengthLabel} style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                  <div className={authStyles.strengthBar}>
                    <div
                      className={authStyles.strengthBarFill}
                      style={{
                        width: `${passwordStrength.strength}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                </div>
                <ul className={authStyles.strengthChecklist}>
                  <li className={passwordStrength.checks.length ? authStyles.checkPassed : ''}>
                    {passwordStrength.checks.length ? '✓' : '○'} At least 8 characters
                  </li>
                  <li className={passwordStrength.checks.uppercase ? authStyles.checkPassed : ''}>
                    {passwordStrength.checks.uppercase ? '✓' : '○'} One uppercase letter
                  </li>
                  <li className={passwordStrength.checks.number ? authStyles.checkPassed : ''}>
                    {passwordStrength.checks.number ? '✓' : '○'} One number
                  </li>
                  <li className={passwordStrength.checks.special ? authStyles.checkPassed : ''}>
                    {passwordStrength.checks.special ? '✓' : '○'} One special character
                  </li>
                </ul>
              </div>
            )}
          </FormGroup>
          <FormGroup label="Referral Code (Optional)" htmlFor="referralCode">
            <Input
              id="referralCode"
              name="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Enter referral code if you have one"
            />
          </FormGroup>

          {/* Terms & Conditions Checkbox */}
          <div className={authStyles.termsCheckbox}>
            <label>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          <div className={authStyles.buttonGrid}>
            <Button type="submit" variant="primary" fullWidth disabled={isLoading || !acceptedTerms}>
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <Button variant="google" fullWidth onClick={handleGoogleSignUp}>Sign Up with Google</Button>
          </div>
        </form>
      </div>
      <div className={authStyles.authSwitch}>
        Already have an account? <Link href="/login">Log In</Link>
      </div>
    </Container>
  );
}