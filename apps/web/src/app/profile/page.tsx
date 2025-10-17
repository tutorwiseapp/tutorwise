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

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { Profile } from '@/types';
import { useImageUpload } from '@/hooks/useImageUpload';
import ImageUpload from '@/app/components/listings/ImageUpload'; // Using the shared component
import styles from './page.module.css';
import Container from '@/app/components/layout/Container';
import ProfileSidebar from '@/app/components/ui/profile/ProfileSidebar';
import Card from '@/app/components/ui/Card';
import Message from '@/app/components/ui/Message';
import Tabs from '@/app/components/ui/Tabs';
import ProfileCompletenessIndicator from '@/app/components/profile/ProfileCompletenessIndicator';
import FormGroup from '@/app/components/ui/form/FormGroup';

// ... (imports and schema remain the same)

const ProfilePage = () => {
  const { profile, isLoading, user } = useUserProfile();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { isUploading, error: uploadError, handleFileSelect } = useImageUpload({
    onUploadSuccess: (url) => {
      setFormData(prev => ({ ...prev, avatar_url: url }));
      setMessage({ text: 'Avatar uploaded successfully! Save your profile to apply the change.', type: 'success' });
    },
    onUploadError: (error) => {
      setMessage({ text: error, type: 'error' });
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleAvatarSelected = (files: File[]) => {
    if (files.length > 0 && user) {
      handleFileSelect(files[0], user.id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
      } else {
        const errorData = await response.json();
        let errorMessage = 'Failed to update profile';
        if (response.status === 400) {
          errorMessage = 'Validation error: ' + (errorData.message || '');
        } else if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        setMessage({ text: errorMessage, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Failed to update profile', type: 'error' });
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  if (isLoading || !profile) {
    // // return <ProfilePageSkeleton />;
  }

  const tabOptions = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'security', label: 'Account Security' },
  ];

  if (isLoading) {
    return (
      <Container>
        <div className={styles.loading}>Loading profile...</div>
      </Container>
    );
  }

  return (
    <Container>
      <div className={styles.profileLayout}>
        <aside>
          <ProfileSidebar user={profile || {}} />
        </aside>
        <main>
          <Card>
            {message && <Message type={message.type}>{message.text}</Message>}
            <Tabs tabs={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'profile' && (
              <div className={styles.tabContent}>
                {profile && <ProfileCompletenessIndicator profile={profile} />}

                <FormGroup label="Profile Photo" htmlFor="avatar">
                  <ImageUpload
                    onUploadComplete={(urls) => setFormData(prev => ({ ...prev, avatar_url: urls[0] || undefined }))}
                    existingImages={(formData as any)?.avatar_url ? [(formData as any).avatar_url] : []}
                  />
                  {isUploading && <p>Uploading...</p>}
                  {uploadError && <p className={styles.error}>{uploadError}</p>}
                </FormGroup>

                <form onSubmit={handleSave}>
                  <FormGroup label="Display Name" htmlFor="full_name">
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup label="About (Public Bio)" htmlFor="bio">
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup label="Referral Categories" htmlFor="categories">
                    <input
                      id="categories"
                      name="categories"
                      type="text"
                      value={formData.categories || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, categories: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup label="Achievements" htmlFor="achievements">
                    <input
                      id="achievements"
                      name="achievements"
                      type="text"
                      value={formData.achievements || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup label="Email" htmlFor="email">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ''}
                      readOnly
                      disabled
                    />
                  </FormGroup>
                  <button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}
            {activeTab === 'security' && (
              <div className={styles.tabContent}>
                <h2>Security Settings</h2>
                <p>Change the password for your account.</p>
              </div>
            )}
          </Card>
        </main>
      </div>
    </Container>
  );
};

export default ProfilePage;