'use client';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import styles from './page.module.css';

const TermsOfServicePage = () => {
  return (
    <Container variant="narrow">
      <PageHeader title="Terms of Service" subtitle="Last Updated: July 17, 2025" />
      <div className={styles.legalText}>
        <h2>1. Introduction</h2><p>Welcome to Tutorwise. These Terms of Service govern your use of our website and services. By accessing or using our service, you agree to be bound by these terms.</p>
        <h2>2. Use of Our Service</h2><p>You must use our service in compliance with all applicable laws. You are responsible for any activity that occurs through your account.</p>
      </div>
    </Container>
  );
};
export default TermsOfServicePage;