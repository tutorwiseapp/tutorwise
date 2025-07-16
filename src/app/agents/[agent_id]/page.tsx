'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { User } from '@/types';

import Container from '@/app/components/layout/Container';
// UPDATED: Replaced ContentBox with Card for a unified component system
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// This is a placeholder utility function. In a real app, this would use a proper library.
const getProfileImageUrl = (user: Partial<User>) => {
    if (user.customPictureUrl) return user.customPictureUrl;
    return `https://i.pravatar.cc/150?u=${user.agentId || 'default'}`;
};

// A self-contained ProfileCard component for the left panel
const ProfileCard = ({ agent, isOwnProfile }: { agent: Partial<User>, isOwnProfile?: boolean }) => {
  return (
    // UPDATED: Using the Card component as the base container
    <Card className={styles.profileCard}>
      <div className={styles.coverPhoto} />
      <div className={styles.avatarContainer}>
        <Image
          src={getProfileImageUrl(agent)}
          alt={`${agent.displayName}'s profile picture`}
          width={150} height={150}
          className={styles.profileAvatar}
        />
      </div>
      <div className={styles.profileBody}>
        <h2 className={styles.profileName}>{agent.displayName}</h2>
        <p className={styles.profileId}>{agent.agentId}</p>
        {isOwnProfile && <Link href="/profile" className={styles.editProfileLink}>Edit Profile</Link>}
        
        <div className={styles.detailsSection}><h3>About</h3><p>{agent.bio}</p></div>
        <div className={styles.detailsSection}><h3>Specialties</h3>
          <div className={styles.tagContainer}>
            {agent.categories?.split(',').map(cat => <span key={cat} className={styles.tag}>{cat.trim()}</span>)}
          </div>
        </div>
        <div className={styles.detailsSection}><h3>Achievements</h3><p>{agent.achievements}</p></div>
      </div>
    </Card>
  );
};


const AgentProfilePage = () => {
  const [agent, setAgent] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const agentId = params.agentId as string;

  useEffect(() => {
    if (agentId) {
      const allUsers: User[] = JSON.parse(localStorage.getItem('vinite_users') || '[]');
      const foundAgent = allUsers.find(user => user.agentId === agentId) || allUsers[0];
      if (foundAgent) {
        // Add mock data for a richer demo profile
        foundAgent.bio = "Hello there!";
        foundAgent.categories = "Tutoring, SaaS";
        foundAgent.achievements = "I have done a good job!";
      }
      setAgent(foundAgent || null);
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
          <h1>Agent Not Found</h1>
          <p>The agent with ID <strong>{agentId}</strong> does not exist.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className={styles.profileGrid}>
        <aside>
          <ProfileCard agent={agent} />
        </aside>
        
        <main>
          {/* UPDATED: All instances of ContentBox are now Card */}
          <Card className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Actions</h3>
            <div className={styles.actionsGrid}>
              <Button variant="primary" fullWidth>Refer Me</Button>
              <Button variant="secondary" fullWidth>Reward Me</Button>
            </div>
          </Card>

          <Card className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Share Profile</h3>
            <div className={styles.actionsGrid}>
              <Button variant="secondary" fullWidth>Share on WhatsApp</Button>
              <Button variant="secondary" fullWidth>Share on LinkedIn</Button>
              <Button variant="secondary" fullWidth>Contact Me</Button>
            </div>
          </Card>
          
          <Card className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Recent Activity</h3>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span>Generated a new link for 
                  <strong>
                    <a href="https://learnhub.com" target="_blank" rel="noopener noreferrer"> LearnHub</a>
                  </strong>
                </span>
              </div>
              <div className={styles.listItem}>
                <span>A referral for 
                  <strong>
                    <a href="https://saasify.com" target="_blank" rel="noopener noreferrer"> SaaSify</a>
                  </strong>
                </span>
                <span>resulted in a new client!</span>
              </div>
              <div className={styles.listItem}>
                <span>Shared a link for 
                  <strong>
                    <a href="https://designco.com" target="_blank" rel="noopener noreferrer"> DesignCo</a>
                  </strong>
                </span>
                <span>via WhatsApp</span>
              </div>
            </div>
          </Card>
          
          <Card className={styles.actionCard}>
            <h3 className={styles.cardTitle}>Statistics</h3>
            <div className={styles.list}>
              <div className={styles.listItem}><span>Member Since</span><span>July 2025</span></div>
              <div className={styles.listItem}><span>Total Referrals</span><span>128</span></div>
            </div>
          </Card>
        </main>
      </div>
    </Container>
  );
};
export default AgentProfilePage;