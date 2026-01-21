'use client';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import styles from './page.module.css';

const PrivacyPolicyPage = () => {
  return (
    <Container variant="narrow">
      <PageHeader title="Privacy Policy" subtitle="Last Updated: July 17, 2025" />
      <div className={styles.legalText}>
        <h2>1. Information We Collect</h2><p>We collect information you provide directly to us, such as when you create an account, as well as information automatically collected when you use our services.</p>
        <h2>2. How We Use Your Information</h2><p>We use the information we collect to operate, maintain, and provide the features and functionality of the Tutorwise platform.</p>
      </div>
    </Container>
  );
};
export default PrivacyPolicyPage;