/*
 * Filename: src/app/profile/page.tsx
 * Purpose: Allows the authenticated user to edit their profile information.
 *
 * Change History:
 * C002 - 2025-07-19 : 20:05 - Integrated save functionality with DataProvider.
 * C001 - 26 July 2024 : 12:00 - Initial creation and UI refinements.
 *
 * Last Modified: 2025-07-19
 * Requirement ID: VIN-A-01.2
 *
 * Change Summary:
 * The `handleSave` function has been refactored. It now uses the `updateUser` function from the `useData`
 * context to persist the user's form data to the central `localStorage` user list. It also updates the
 * currently authenticated user's state via the `login` function from `useAuth` to ensure the UI reflects
 * the changes immediately without a page reload.
 *
 * Impact Analysis:
 * This change makes the profile editing feature fully functional within the mock environment, creating a
 * seamless editing and viewing experience when combined with the new public profile page.
 *
 * Dependencies: "react", "@/types", "@/components/auth/AuthProvider", "@/components/data/DataProvider", and various UI/layout components.
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
  const { user, login } = useAuth();
  const { updateUser } = useData();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData(user);
    }
  }, [user]);

  if (!user) {
    return <Container><p>Loading profile...</p></Container>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const updatedProfile: Profile = { ...user, ...formData } as Profile;
      
      // Persist changes to central mock data store
      updateUser(updatedProfile);
      
      // Update the live auth context to reflect changes immediately
      login(updatedProfile);

      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const tabOptions = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'security', label: 'Account Security' },
  ];

  return (
    <Container>
      <div className={styles.profileLayout}>
        <aside className={styles.sidebarWrapper}>
          <ProfileSidebar user={user} />
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
