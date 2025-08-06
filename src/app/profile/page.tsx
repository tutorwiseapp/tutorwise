/*
 * Filename: src/app/profile/page.tsx
 * Purpose: Allows the authenticated user to edit their profile information and upload a photo.
 * Change History:
 * C022 - 2025-07-27 : 10:00 - Definitive fix for the "View Public Profile" link.
 * C021 - 2025-07-26 : 21:45 - Passed `isOwnProfile` prop to ProfileSidebar.
 * ... (previous history)
 * Last Modified: 2025-07-27 : 10:00
 * Requirement ID: VIN-UI-013
 * Change Summary: This is the definitive fix. The `agent_id` from the Clerk user object's
 * publicMetadata is now being correctly passed down to the ProfileSidebar component. This
 * resolves the root cause of the "View Public Profile" link not working, as the link was
 * previously not being rendered at all due to the missing `agent_id` prop.
 * Impact Analysis: This change fixes a critical user journey bug. It completes the data
 * flow from the parent page to the child component, making the link functional.
 * Dependencies: "@clerk/nextjs", "next/link", and various VDL UI components.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Profile } from '@/types';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient'; // Import the Supabase client

// Component Imports
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

const ProfilePage = () => {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        email: user.emailAddresses[0]?.emailAddress || '',
        display_name: user.fullName || '',
        agent_id: user.publicMetadata?.agent_id as string || '',
        bio: user.publicMetadata?.bio as string || '',
        categories: user.publicMetadata?.categories as string || '',
        achievements: user.publicMetadata?.achievements as string || '',
        cover_photo_url: user.publicMetadata?.cover_photo_url as string || '',
        roles: user.publicMetadata?.role ? [user.publicMetadata.role as 'agent' | 'seeker' | 'provider'] : [],
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFileRef.current?.files) {
      setMessage({ text: 'No file selected for upload.', type: 'error' });
      return;
    }
    
    const file = avatarFileRef.current.files[0];
    setMessage({ text: 'Uploading photo...', type: 'success' });

    try {
      const response = await fetch(`/api/avatar/upload?filename=${file.name}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed.');
      }
      
      await response.json();
      await user?.reload();
      setMessage({ text: `Photo uploaded successfully!`, type: 'success' });

    } catch (error) {
      setMessage({ text: 'Upload failed. Please try again.', type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to update profile.');
      await user.reload();
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      const error = err as Error;
      setMessage({ text: `Error updating profile: ${error.message || 'Please try again.'}`, type: 'error' });
    } finally {
      setIsSaving(false);
      window.scrollTo(0, 0);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isLoaded || !user) {
    return <Container><p>Loading profile...</p></Container>;
  }

  const tabOptions = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'security', label: 'Account Security' },
  ];

  const profileForSidebar: Partial<Profile> = {
    display_name: user.fullName || '',
    // --- THIS IS THE SURGICAL FIX ---
    // The agent_id from publicMetadata must be passed down to the child component.
    agent_id: user.publicMetadata.agent_id as string || '',
    custom_picture_url: user.imageUrl,
    roles: user.publicMetadata.role ? [user.publicMetadata.role as 'agent' | 'seeker' | 'provider'] : [],
  };

  return (
    <Container>
      <div className={styles.profileLayout}>
        <aside>
          <ProfileSidebar user={profileForSidebar} isOwnProfile={true} />
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