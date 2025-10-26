'use client';

import { useState } from 'react';
import type { Profile } from '@/types';
import Image from 'next/image';
import getProfileImageUrl from '@/lib/utils/image';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './AgentProfile.module.css';
import EditAgentDetailsModal from './EditAgentDetailsModal';

interface AgentProfileProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function AgentProfile({ profile, isEditable = false, onSave = () => {} }: AgentProfileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const recentActivity = [
    { id: 1, text: 'Generated a new link for', subject: 'LearnHub', url: 'https://learnhub.com' },
    { id: 2, text: 'A referral for', subject: 'SaaSify', url: 'https://saasify.com', status: 'resulted in a new client!' },
    { id: 3, text: 'Shared a link for', subject: 'DesignCo', url: 'https://designco.com', status: 'via WhatsApp' },
  ];

  return (
    <div className={styles.profileGrid}>
      <aside>
         <Card className={styles.profileCard}>
          <div className={styles.coverPhoto} style={{ backgroundImage: profile.cover_photo_url ? `url(${profile.cover_photo_url})` : 'none' }} />
          <Image
            src={getProfileImageUrl(profile)}
            alt={`${profile.full_name}'s profile picture`}
            width={150} height={150}
            className={styles.profileAvatar}
          />
          <div className={styles.profileBody}>
            <h2 className={styles.profileName}>{profile.full_name}</h2>
            <p className={styles.profileId}>ID: {profile.referral_id || profile.id.slice(0, 8)}</p>
            
            {isEditable && (
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
                Edit Details
              </Button>
            )}
            
            <div className={styles.detailsSection}>
              <h3>About</h3>
              <p className={styles.profileBio}>{profile.bio || 'This agent has not provided a bio yet.'}</p>
            </div>
            
            <div className={styles.detailsSection}>
              <h3>Specialties</h3>
              <p className={styles.noDataText}>{profile.categories || 'Not specified.'}</p>
            </div>

            <div className={styles.detailsSection}>
              <h3>Achievements</h3>
              <p className={styles.noDataText}>{profile.achievements || 'No achievements to display.'}</p>
            </div>
          </div>
        </Card>
      </aside>
      
      <main>
        {!isEditable && (
          <>
            <Card className={styles.contentCard}>
              <h3>Actions</h3>
              <div className={styles.actionsGrid}>
                <Button variant="primary">Refer Me</Button>
                <Button variant="secondary">Reward Me</Button>
              </div>
            </Card>

            <Card className={styles.contentCard}>
              <h3>Shares</h3>
              <div className={styles.sharesGrid}>
                <Button variant="secondary">Share on WhatsApp</Button>
                <Button variant="secondary">Share on LinkedIn</Button>
                <Button variant="secondary">Contact Me</Button>
              </div>
            </Card>
          </>
        )}

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
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : 'N/A'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span>Total Referrals</span>
              <span className={styles.value}>128</span>
            </div>
          </div>
        </Card>
      </main>
      {isEditable && (
        <EditAgentDetailsModal
          profile={profile}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={onSave}
        />
      )}
    </div>
  );
};
