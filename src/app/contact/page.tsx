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
import styles from './page.module.css'; // --- FIX ---

const ContactPage = () => {
  const [formState, setFormState] = useState({ status: 'idle', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading', message: '' });
    setTimeout(() => { setFormState({ status: 'success', message: 'Thank you! Your message has been sent.' }); }, 1500);
  };

  return (
    <Container className={styles.container}>
      <PageHeader title="Contact Us" subtitle="Have a question or feedback? We'd love to hear from you." />
      <Card>
        {formState.status === 'success' ? ( <Message type="success">{formState.message}</Message> ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}><FormGroup label="Your Name" htmlFor="name"><Input id="name" required /></FormGroup><FormGroup label="Your Email" htmlFor="email"><Input id="email" type="email" required /></FormGroup></div>
            <FormGroup label="Subject" htmlFor="subject"><Input id="subject" required /></FormGroup>
            <FormGroup label="Message" htmlFor="message"><Textarea id="message" rows={5} required /></FormGroup>
            <Button type="submit" variant="primary" disabled={formState.status === 'loading'}>{formState.status === 'loading' ? 'Sending...' : 'Send Message'}</Button>
          </form>
        )}
      </Card>
    </Container>
  );
};
export default ContactPage;