'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import getProfileImageUrl from '@/lib/utils/image';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';
import { useUserProfile } from '@/app/contexts/UserProfileContext'; // Use Supabase context

const AgentProfilePage = () => {
  const [agent, setAgent] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const agentId = params?.agentId as string;
  const { profile: loggedInUserProfile } = useUserProfile();

  const recentActivity = [
    { id: 1, text: 'Generated a new link for', subject: 'LearnHub', url: 'https://learnhub.com' },
    { id: 2, text: 'A referral for', subject: 'SaaSify', url: 'https://saasify.com', status: 'resulted in a new client!' },
    { id: 3, text: 'Shared a link for', subject: 'DesignCo', url: 'https://designco.com', status: 'via WhatsApp' },
  ];

  useEffect(() => {
    if (!agentId) {
        setIsLoading(false);
        return;
    };
    const fetchAgentProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) throw new Error('Agent profile not found.');
        const data: Profile = await response.json();
        setAgent(data);
      } catch (error) {
        console.error("Failed to fetch agent profile:", error);
        setAgent(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgentProfile();
  }, [agentId]);

  const handleReferMe = () => {
    if (!agent) return;
    sessionStorage.setItem('vinite_referral_agent_id', agent.id);
    router.push('/');
  };

  const handleRewardMe = () => {
    if (!agent) return;
    router.push(`/signup?reward_agent=${agent.id}`);
  };

  const handleContactMe = () => {
    if (!agent) return;
    router.push(`/contact-agent?id=${agent.id}`);
  };
  
  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    if (!agent) return;
    const text = `Check out ${agent.display_name}'s Vinite referral profile: ${window.location.href}`;
    let url = '';
    if (platform === 'whatsapp') {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    }
    window.open(url, '_blank');
  };

  if (isLoading) {
    return <Container><p className={styles.message}>Loading Agent Profile...</p></Container>;
  }
  
  if (!agent) {
    return (
      <Container>
        <div className={styles.message}>
          <h1>Agent Not Found</h1>
          <p>The agent with ID <strong>{agentId}</strong> could not be found.</p>
        </div>
      </Container>
    );
  }

  const isOwnProfile = loggedInUserProfile?.id === agent.id;

  return (
    <Container>
      <div className={styles.profileGrid}>
        <aside>
           <Card className={styles.profileCard}>
            <div className={styles.coverPhoto} style={{ backgroundImage: agent.cover_photo_url ? `url(${agent.cover_photo_url})` : 'none' }} />
            <Image
              src={getProfileImageUrl(agent)}
              alt={`${agent.display_name}'s profile picture`}
              width={150} height={150}
              className={styles.profileAvatar}
            />
            <div className={styles.profileBody}>
              <h2 className={styles.profileName}>{agent.display_name}</h2>
              <p className={styles.profileId}>ID: {agent.referral_id || agent.id.slice(0, 8)}</p>
              
              {isOwnProfile && <Link href="/profile" className={styles.editProfileLink}>Edit Profile</Link>}
              
              <div className={styles.detailsSection}>
                <h3>About</h3>
                <p className={styles.profileBio}>{agent.bio || 'This agent has not provided a bio yet.'}</p>
              </div>
              
              <div className={styles.detailsSection}>
                <h3>Specialties</h3>
                <p className={styles.noDataText}>{agent.categories || 'Not specified.'}</p>
              </div>

              <div className={styles.detailsSection}>
                <h3>Achievements</h3>
                <p className={styles.noDataText}>{agent.achievements || 'No achievements to display.'}</p>
              </div>
            </div>
          </Card>
        </aside>
        
        <main>
          <Card className={styles.contentCard}>
            <h3>Actions</h3>
            <div className={styles.actionsGrid}>
              <Button variant="primary" onClick={handleReferMe}>Refer Me</Button>
              <Button variant="secondary" onClick={handleRewardMe}>Reward Me</Button>
            </div>
          </Card>

          <Card className={styles.contentCard}>
            <h3>Shares</h3>
            <div className={styles.sharesGrid}>
              <Button variant="secondary" onClick={() => handleShare('whatsapp')}>Share on WhatsApp</Button>
              <Button variant="secondary" onClick={() => handleShare('linkedin')}>Share on LinkedIn</Button>
              <Button variant="secondary" onClick={handleContactMe}>Contact Me</Button>
            </div>
          </Card>

          <Card className={styles.contentCard}>
            <h3>Recent Activity</h3>
            <div className={styles.activityFeed}>
              {recentActivity.map(activity => (
                <div key={activity.id} className={styles.activityItem}>
                  <span>
                    {activity.text}{' '}
                    <a href={activity.url} target="_blank" rel="noopener noreferrer" className={styles.activityLink}>
                      {activity.subject}
                    </a>
                  </span>
                  {activity.status && <span className={styles.activityContext}>{activity.status}</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card className={styles.contentCard}>
            <h3>Statistics</h3>
            <div className={styles.statsList}>
              <div className={styles.statItem}>
                <span>Member Since</span>
                <span className={styles.value}>
                  {agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : 'N/A'}
                </span>
              </div>
              <div className={styles.statItem}>
                <span>Total Referrals</span>
                <span className={styles.value}>128</span>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </Container>
  );
};
export default AgentProfilePage;