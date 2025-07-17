'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { User } from '@/types';

import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import ProfileSidebar from '@/app/components/ui/profile/ProfileSidebar';
import styles from './page.module.css';

const AgentProfilePage = () => {
  const [agent, setAgent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const agentId = params.agentId as string;

  useEffect(() => {
    // This effect now reliably finds the agent from the initialized mock data.
    if (agentId) {
      const usersJSON = localStorage.getItem('vinite_users');
      if (usersJSON) {
        const allUsers: User[] = JSON.parse(usersJSON);
        const foundAgent = allUsers.find(user => user.agentId === agentId);
        setAgent(foundAgent || null);
      }
    }
    setLoading(false);
  }, [agentId]);

  if (loading) {
    return <Container><p className={styles.message}>Loading...</p></Container>;
  }
  
  if (!agent) {
    return (
      <Container>
        <div className={styles.message}>
          {/* This is the view you are currently seeing */}
          <h1>Agent Not Found</h1>
          <p>The agent with ID <strong>{agentId}</strong> could not be found.</p>
        </div>
      </Container>
    );
  }

  const createMailtoLink = () => {
    if (!agent?.email) return '#';
    const subject = `Inquiry via Vinite Profile`;
    const body = `Hello ${agent.displayName},\n\nI'm contacting you through your Vinite profile.`;
    return `mailto:${agent.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Container>
      <div className={styles.profileGrid}>
        <ProfileSidebar user={agent} />
        <main>
          <Card className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Actions</h3>
            <div className={styles.actionsGrid}>
              <Button variant="primary" fullWidth>Refer Me</Button>
              <a href={createMailtoLink()} className='btn' style={{textDecoration: 'none'}}>
                <Button variant="secondary" fullWidth as="span">Contact Me</Button>
              </a>
            </div>
          </Card>
          
          <Card className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Recent Activity</h3>
            <div className={styles.list}>
              <div className={styles.listItem}><span>Generated a new link for <strong><a href="#">LearnHub</a></strong></span></div>
              <div className={styles.listItem}><span>A referral for <strong><a href="#">SaaSify</a></strong> resulted in a new client!</span></div>
            </div>
          </Card>
        </main>
      </div>
    </Container>
  );
};
export default AgentProfilePage;