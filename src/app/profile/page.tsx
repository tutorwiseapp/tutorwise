/*
 * Filename: src/app/profile/page.tsx
 * Purpose: Allows the authenticated user to edit their profile information.
 *
 * Change History:
 * C005 - 2025-07-20 : 19:45 - Refactored JSX to wrap main content in a Card for visual consistency.
 * C004 - 2025-07-20 : 11:45 - Fixed TypeScript error by using a type assertion on profile updates.
 * C003 - 2025-07-20 : 10:30 - Updated 'Account Security' tab to link to the new change-password page.
 * C002 - 2025-07-20 : 09:00 - Integrated save functionality with both DataProvider and AuthProvider.
 * C001 - 26 July 2024 : 12:00 - Initial creation and UI refinements.
 *
 * Last Modified: 2025-07-20 : 19:45
 * Requirement ID: VIN-UI-012
 *
 * Change Summary:
 * The main content area (Tabs, form, etc.) is now wrapped in a `<Card>` component. This aligns the
 * page's visual structure with the public agent profile, creating a consistent "floating cards"
 * layout and fixing the previously identified misalignment and double-border issues.
 *
 * Impact Analysis:
 * This is a structural and visual change that significantly improves UI consistency across the app.
 * It depends on the corresponding CSS change in `page.module.css`.
 *
 * Dependencies: "react", "@/types", "@/app/components/auth/AuthProvider", "@/app/components/data/DataProvider", and various UI/layout components.
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
import Card from '@/app/components/ui/Card'; // --- FIX: Import the Card component
import styles from './page.module.css';

const ProfilePage = () => {
  const { user: profile, login, isLoading: isAuthLoading } = useAuth();
  const { updateUser, isLoading: isDataLoading } = useData();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const updatedProfile = { ...profile, ...formData } as Profile;
    updateUser(updatedProfile);
    login(updatedProfile);

    setMessage('Profile updated successfully!');
    window.scrollTo(0, 0);
    setTimeout(() => setMessage(null), 3000);
  };

  if (isAuthLoading || isDataLoading) {
    return <Container><p>Loading profile...</p></Container>;
  }

  if (!profile) {
    return <Container><p>Please log in to view your profile.</p></Container>;
  }

  const tabOptions = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'security', label: 'Account Security' },
  ];

  return (
    <Container>
      <div className={styles.profileLayout}>
        {/* The <aside> is now just a layout container */}
        <aside>
          <ProfileSidebar user={profile} />
        </aside>
        {/* The <main> is now just a layout container */}
        <main>
          {/* --- THIS IS THE FIX --- */}
          {/* The content is now wrapped in a Card component for visual consistency */}
          <Card>
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
          </Card>
        </main>
      </div>
    </Container>
  );
};

export default ProfilePage;