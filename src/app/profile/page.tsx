/*
 * Filename: src/app/profile/page.tsx
 * Purpose: Allows the authenticated user to edit their profile information, migrated to Kinde.
 * Change History:
 * C026 - 2025-08-26 : 16:00 - Corrected TypeScript error for the message state type.
 * C025 - 2025-08-26 : 15:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C024 - 2025-08-08 : 16:00 - Implemented skeleton loading for instant perceived performance.
 * Last Modified: 2025-08-26 : 16:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This is the definitive fix for the build error "Type '"warning"' is not assignable to type '"success" | "error"'". The `useState` hook for the `message` state was updated to correctly include 'warning' in its type definition, aligning it with the props of the Message component. This resolves the TypeScript compilation error.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Profile } from '@/types';
import { useUserProfile } from '@/app/contexts/UserProfileContext'; // --- THIS IS THE FIX ---

import ProfileSidebar from '@/app/components/ui/profile/ProfileSidebar';
import Container from '@/app/components/layout/Container';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Textarea from '@/app/components/ui/form/Textarea';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import Tabs from '@/app/components/ui/Tabs';
import Card from '@/app/components/ui/Card';
import styles from './page.module.css';

const ProfilePageSkeleton = () => (
    <Container>
        <div className={styles.profileLayout}>
            <aside>
                <Card className={styles.sidebarSkeleton}>
                    <div className={styles.avatarSkeleton} />
                    <div className={styles.textSkeleton} style={{ width: '60%', height: '24px' }} />
                    <div className={styles.textSkeleton} style={{ width: '40%', height: '16px' }} />
                    <div className={styles.dividerSkeleton} />
                    <div className={styles.textSkeleton} style={{ width: '80%', height: '16px' }} />
                    <div className={styles.textSkeleton} style={{ width: '80%', height: '16px' }} />
                </Card>
            </aside>
            <main>
                <Card>
                    <div className={styles.textSkeleton} style={{ width: '200px', height: '30px' }} />
                </Card>
            </main>
        </div>
    </Container>
);

const ProfilePage = () => {
  const { profile, isLoading } = useUserProfile(); // --- THIS IS THE FIX ---
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Populate the form state once the full profile is loaded from the context.
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAvatarUpload = async () => {
    setMessage({ text: 'Avatar upload functionality is being migrated.', type: 'warning' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to update profile.');
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: `Error updating profile: ${(err as Error).message}`, type: 'error' });
    } finally {
      setIsSaving(false);
      window.scrollTo(0, 0);
    }
  };

  if (isLoading || !profile) {
    return <ProfilePageSkeleton />;
  }

  const tabOptions = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'security', label: 'Account Security' },
  ];

  return (
    <Container>
      <div className={styles.profileLayout}>
        <aside>
          {/* --- THIS IS THE FIX: Pass the full profile to the sidebar --- */}
          <ProfileSidebar user={profile} />
        </aside>
        <main>
          <Card>
            {message && <Message type={message.type}>{message.text}</Message>}
            <Tabs tabs={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'profile' && (
              <div className={styles.tabContent}>
                <FormGroup label="Profile Photo" htmlFor="avatar">
                  <div className={styles.fileUploadGroup}>
                    <Input id="avatar" type="file" ref={avatarFileRef} accept="image/*" />
                    <Button type="button" onClick={handleAvatarUpload}>Upload Photo</Button>
                  </div>
                </FormGroup>

                <form onSubmit={handleSave}>
                  <FormGroup label="Display Name" htmlFor="display_name">
                    <Input id="display_name" value={formData.display_name || ''} onChange={handleInputChange} disabled={isSaving} />
                  </FormGroup>
                  <FormGroup label="Referral Categories" htmlFor="categories">
                    <Input id="categories" value={formData.categories || ''} onChange={handleInputChange} placeholder="e.g., Tutoring, SaaS" disabled={isSaving} />
                  </FormGroup>
                  <FormGroup label="About (Public Bio)" htmlFor="bio" compact>
                    <Textarea id="bio" value={formData.bio || ''} onChange={handleInputChange} rows={4} placeholder="A brief description about yourself..." disabled={isSaving} />
                  </FormGroup>
                  <FormGroup label="Achievements" htmlFor="achievements" compact>
                    <Textarea id="achievements" value={formData.achievements || ''} onChange={handleInputChange} rows={3} placeholder="Describe your key achievements..." disabled={isSaving} />
                  </FormGroup>
                  <FormGroup
                    label="Cover Photo URL"
                    htmlFor="cover_photo_url"
                    footnote="Optional. Provide a URL for your public profile's banner image."
                  >
                    <Input id="cover_photo_url" value={formData.cover_photo_url || ''} onChange={handleInputChange} disabled={isSaving} />
                  </FormGroup>
                  <FormGroup
                    label="Email"
                    htmlFor="email"
                    footnote="Used for your login. Cannot be changed."
                  >
                    <Input id="email" value={formData.email || ''} readOnly disabled />
                  </FormGroup>
                  <Button type="submit" style={{ marginTop: 'var(--space-4)' }} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
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