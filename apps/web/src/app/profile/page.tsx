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
import { z } from 'zod';
import type { Profile } from '@/types';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

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

// Validation schema
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
});

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

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setMessage({ text: 'Image must be less than 5MB', type: 'error' });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ text: 'Only JPEG, PNG, and WebP images allowed', type: 'error' });
      return;
    }

    // For now, show a coming soon message with better UX
    setMessage({
      text: `Image "${file.name}" validated successfully! Avatar upload feature coming soon.`,
      type: 'warning'
    });

    // TODO: Implement Supabase Storage upload
    // const supabase = createClient();
    // ... upload logic ...
  };

  const handleAvatarButtonClick = () => {
    avatarFileRef.current?.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Validate form data
    try {
      profileSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setMessage({
          text: err.issues[0].message,
          type: 'error'
        });
        window.scrollTo(0, 0);
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Specific error messages based on status code
        if (response.status === 400) {
          throw new Error(`Validation error: ${errorData.message || 'Invalid data'}`);
        } else if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to update this profile.');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error('Failed to update profile. Please try again.');
        }
      }

      setMessage({ text: 'Profile updated successfully!', type: 'success' });

      // Optionally reload profile data from context
      // This ensures UI reflects latest data
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Profile save error:', errorMessage);

      setMessage({
        text: errorMessage,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    <Input id="avatar" type="file" ref={avatarFileRef} accept="image/*" onChange={handleAvatarChange} />
                    <Button type="button" onClick={handleAvatarButtonClick}>Upload Photo</Button>
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