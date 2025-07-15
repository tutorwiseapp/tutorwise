'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/types';

// --- Component Imports ---

// CORRECTED: Use a relative path because ProfileSidebar is in the same folder.
import ProfileSidebar from './ProfileSidebar'; 

// These components are shared, so the alias path is correct.
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';

import styles from './page.module.css';

// Mock user data for demonstration purposes
const mockUser: User = {
  id: 1,
  agentId: 'A1-JS123456',
  displayName: 'Jordan Smith',
  email: 'jordan.smith@example.com',
  bio: 'A passionate connector and tech enthusiast dedicated to finding the best tools and services for my network. I specialize in SaaS, online education, and freelance resources.',
  categories: 'SaaS, Education, Freelancing, Tech',
  achievements: 'Top Referrer Q1 2025',
  customPictureUrl: 'https://i.pravatar.cc/150?u=A1-JS123456',
  coverPhotoUrl: 'https://images.unsplash.com/photo-1554147090-e1221a04a025?q=80&w=2070&auto=format&fit=crop',
};

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    // In a real app, you would fetch this data from an API.
    setUser(mockUser);
  }, []);

  const handleSaveChanges = () => {
    // Placeholder for save logic
    setMessage({ text: 'Profile saved successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!user) {
    return <Container><div>Loading profile...</div></Container>;
  }

  return (
    <Container>
      <PageHeader
        title="Edit Profile"
        subtitle="Manage your public profile information and settings."
      />
      {message && <Message type={message.type}>{message.text}</Message>}
      <div className={styles.profileLayout}>
        <ProfileSidebar user={user} />
        
        <div className={styles.mainContent}>
          <Card>
            <form className={styles.profileForm}>
                <div className={styles.formGroup}>
                    <label htmlFor="displayName">Display Name</label>
                    <input id="displayName" type="text" defaultValue={user.displayName} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="agentId">Agent ID</label>
                    <input id="agentId" type="text" defaultValue={user.agentId} readOnly />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="bio">Bio</label>
                    <textarea id="bio" rows={4} defaultValue={user.bio}></textarea>
                </div>
                 <div className={styles.formGroup}>
                    <label htmlFor="categories">Specialties</label>
                    <input id="categories" type="text" defaultValue={user.categories} placeholder="e.g. SaaS, Tech, Marketing" />
                </div>
                <div className={styles.formActions}>
                    <Button type="button" onClick={handleSaveChanges}>Save Changes</Button>
                </div>
            </form>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default ProfilePage;