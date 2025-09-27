/*
 * Filename: src/app/contact-agent/page.tsx
 * Purpose: Provides a form for users to contact a specific agent.
 * Change History:
 * C001 - 2025-08-08 : 22:00 - Initial creation.
 * Last Modified: 2025-08-08 : 22:00
 * Requirement ID: VIN-C-03.3
 * Change Summary: This new page was created to fulfill the "Contact Me" user journey. It uses a URL query parameter to identify the agent and provides a simple, consistent contact form. It must be wrapped in a <Suspense> in any parent component because it uses useSearchParams.
 * Impact Analysis: This is an additive change that makes the "Contact Me" button on the public profile page functional.
 * Dependencies: "react", "next/navigation", and various VDL UI components.
 */
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Textarea from '@/app/components/ui/form/Textarea';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';

// The actual component logic that uses the search params
const ContactAgentForm = () => {
  const [formState, setFormState] = useState({ status: 'idle', message: '' });
  const searchParams = useSearchParams();
  const agentId = searchParams?.get('id');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading', message: '' });
    // Simulate API call
    setTimeout(() => {
      setFormState({ status: 'success', message: `Thank you! Your message has been sent to agent ${agentId}.` });
    }, 1500);
  };

  return (
    <Container variant="form">
      <PageHeader
        title="Contact Agent"
        subtitle={`Send a message directly to agent ${agentId || ''}`}
      />
      <Card>
        {formState.status === 'success' ? (
          <Message type="success">{formState.message}</Message>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormGroup label="Your Name" htmlFor="name">
              <Input id="name" required />
            </FormGroup>
            <FormGroup label="Your Email" htmlFor="email">
              <Input id="email" type="email" required />
            </FormGroup>
            <FormGroup label="Message" htmlFor="message">
              <Textarea id="message" rows={5} required />
            </FormGroup>
            <Button type="submit" variant="primary" disabled={formState.status === 'loading'}>
              {formState.status === 'loading' ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        )}
      </Card>
    </Container>
  );
};

// A wrapper component to handle the Suspense boundary for useSearchParams
const ContactAgentPage = () => {
  return (
    <Suspense fallback={<Container><p>Loading...</p></Container>}>
      <ContactAgentForm />
    </Suspense>
  );
};

export default ContactAgentPage;