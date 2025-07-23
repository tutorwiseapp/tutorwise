/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Renders the user signup page and provides a Suspense boundary for the dynamic form.
 *
 * Change History:
 * C018 - 2025-07-22 : 21:15 - Refactored to use a Suspense boundary to fix the definitive build error.
 * ... (previous history)
 *
 * Last Modified: 2025-07-22 : 21:15
 * Requirement ID (optional): VIN-A-004
 *
 * Change Summary:
 * The page has been refactored into a static Server Component, which is the Next.js best practice.
 * The core form logic, which uses client-side hooks like `useSearchParams`, has been extracted into
 * a new `SignupForm` child component. This new component is now wrapped in a `<Suspense>`
 * boundary, which is the official pattern for resolving the `useSearchParams` build error.
 *
 * Impact Analysis:
 * This change fixes the critical deployment blocker and aligns the page with Next.js architecture.
 */
import React, { Suspense } from 'react';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import SignupForm from '@/app/signup/SignupForm';
import Card from '@/app/components/ui/Card';

// This is a simple UI to show while the interactive form part is loading.
const LoadingForm = () => {
    return (
        <Card>
            <p style={{ textAlign: 'center', padding: 'var(--space-5)' }}>Loading form...</p>
        </Card>
    )
}

// This is now a static Server Component. It can be pre-rendered.
const SignupPage = () => {
  return (
    <Container variant="form">
      <PageHeader 
        title="Create Your Account" 
      />
      <p className="page-tagline">Join to start referring and earning rewards.</p>
      
      {/* This tells Next.js to render the static parts first, and load the dynamic
          SignupForm component on the client, showing a fallback UI in the meantime. */}
      <Suspense fallback={<LoadingForm />}>
        <SignupForm />
      </Suspense>
    </Container>
  );
};

export default SignupPage;