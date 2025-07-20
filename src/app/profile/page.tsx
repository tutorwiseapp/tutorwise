/*
 * Filename: src/app/profile/page.tsx
 * Purpose: Allows the authenticated user to edit their profile information.
 * Last Modified: 2025-07-26
 * Requirement ID: VIN-A-01.2
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Profile } from '@/types';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { useData } from '@/app/components/data/DataProvider';

// Component Imports
import ProfileSidebar from '@/app/components/ui/profile/ProfileSidebar';
import Container from '@/app/components/layout/Container';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Textarea from '@/app/components/ui/form/Textarea';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import Tabs from '@/app/components/ui/Tabs';
import styles from './page.module.css';

const ProfilePage = () => {
  // Use 'user' for live session, but we'll call it 'profile' to match type
  const { user: profile, login } = useAuth(); // Assuming useAuth() returns an object with 'user' and 'login'
  const { updateUser } = useData();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  if (!profile) {
    return <Container><p>Loading profile...</p></Container>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Create the fully updated profile object
    const updatedProfile: Profile = { ...profile, ...formData };
    
    // 1. Persist changes to central mock data store
    updateUser(updatedProfile);
    
    // 2. Update the live auth context to reflect changes immediately
    login(updatedProfile);

    setMessage('Profile updated successfully!');
    window.scrollTo(0, 0);
    setTimeout(() => setMessage(null), 3000);
  };

  const tabOptions = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'security', label: 'Account Security' },
  ];

  return (
    <Container>
      <div className={styles.profileLayout}>
        <aside className={styles.sidebarWrapper}>
          {/* Ensure ProfileSidebar can handle the `Profile` type */}
          <ProfileSidebar user={profile} />
        </aside>
        <main className={styles.profileMain}>
          {message && <Message type="success">{message}</Message>}
          <Tabs tabs={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'profile' && (
            <div className={styles.tabContent}>
              <form onSubmit={handleSave}>
                <FormGroup label="Display Name" htmlFor="display_name">
                  <Input id="display_name" value={formData.display_name || ''} onChange={handleInputChange} />
                </FormGroup>
                <FormGroup label="Referral Categories" htmlFor="categories">
                  <Input id="categories" value={formData.categories || ''} onChange={handleInputChange} placeholder="e.g., SaaS, Education, Tech" />
                </FormGroup>
                <FormGroup label="Public Bio" htmlFor="bio">
                  <Textarea id="bio" value={formData.bio || ''} onChange={handleInputChange} rows={4} placeholder="A brief description about yourself..." />
                </FormGroup>
                <FormGroup label="Achievements" htmlFor="achievements">
                  <Textarea id="achievements" value={formData.achievements || ''} onChange={handleInputChange} rows={3} placeholder="Describe your key achievements..." />
                </FormGroup>
                <FormGroup label="Cover Photo URL" htmlFor="cover_photo_url">
                  <Input id="cover_photo_url" value={formData.cover_photo_url || ''} onChange={handleInputChange} />
                </FormGroup>
                <FormGroup label="Custom Picture URL" htmlFor="custom_picture_url">
                  <Input id="custom_picture_url" value={formData.custom_picture_url || ''} onChange={handleInputChange} />
                </FormGroup>
                <Button type="submit">Save Changes</Button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className={styles.tabContent}>
              <h3>Security Settings</h3>
              <p className={styles.panelDescription}>
                Change the password associated with your account.
              </p>
              <Link href="/settings/change-password" className={styles.textLink}>Change Password</Link>
            </div>
          )}
        </main>
      </div>
    </Container>
  );
};

export default ProfilePage;