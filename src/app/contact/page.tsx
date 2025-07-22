/*
 * Filename: src/app/contact/page.tsx
 * Purpose: Renders the public contact form.
 *
 * Change History:
 * C003 - 2025-07-21 : 22:30 - Refactored to a single-column layout to match the final design.
 * C002 - 2025-07-21 : 21:30 - Refactored to use the standardized Container 'form' variant.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-21 : 22:30
 * Requirement ID (optional): VIN-P-001
 *
 * Change Summary:
 * The unnecessary `div` with a grid layout has been removed from around the "Name" and "Email"
 * fields. All form groups now stack vertically, creating the correct single-column, four-row
 * layout as specified in the design.
 *
 * Impact Analysis:
 * This change corrects the form's layout to match the final design, improving usability and visual consistency.
 */
'use client';

import { useState } from 'react';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Textarea from '@/app/components/ui/form/Textarea';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
// Styles are no longer needed for this page
// import styles from './page.module.css';

const ContactPage = () => {
  const [formState, setFormState] = useState({ status: 'idle', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading', message: '' });
    setTimeout(() => { setFormState({ status: 'success', message: 'Thank you! Your message has been sent.' }); }, 1500);
  };

  return (
    <Container variant="form">
      <PageHeader title="Contact Us" subtitle="Have a question or feedback? We'd love to hear from you." />
      <Card>
        {formState.status === 'success' ? ( <Message type="success">{formState.message}</Message> ) : (
          <form onSubmit={handleSubmit}>
            {/* --- THIS IS THE FIX: The wrapping div has been removed --- */}
            <FormGroup label="Your Name" htmlFor="name">
              <Input id="name" required />
            </FormGroup>
            <FormGroup label="Your Email" htmlFor="email">
              <Input id="email" type="email" required />
            </FormGroup>
            <FormGroup label="Subject" htmlFor="subject">
              <Input id="subject" required />
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
export default ContactPage;