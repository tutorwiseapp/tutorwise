/*
 * Filename: src/app/profile/page.tsx
 * Purpose: Allows the authenticated user to edit their profile information.
 *
 * Change History:
 * C013 - 2025-07-22 : 15:30 - Refactored handleSave to use Supabase, fixing build error.
 * C012 - 2025-07-21 : 20:30 - Refactored to use the 'compact' prop on FormGroup.
 * ... (previous history)
 *
 * Last Modified: 2025-07-22 : 15:30
 * Requirement ID: VIN-B-03.2
 *
 * Change Summary:
 * The component no longer uses the mock `useData` or `login` function. The `handleSave`
 * function is now `async` and calls `supabase.from('profiles').update()` to persist
 * changes directly to the database. The page now relies on the live `AuthProvider` to
 * automatically reflect these changes, resolving the critical build error.
 *
 * Impact Analysis:
 * This completes the migration of the profile page to the live backend.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Profile } from '@/types';
import { useAuth } from '@/app/components/auth/removeAuthProvider';
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
  const { user: profile, isLoading: isAuthLoading } = useAuth(); // `login` is no longer provided
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setMessage(null);

    // Create the object of fields to update
    const updatedFields = {
      display_name: formData.display_name,
      categories: formData.categories,
      bio: formData.bio,
      achievements: formData.achievements,
      cover_photo_url: formData.cover_photo_url,
      custom_picture_url: formData.custom_picture_url,
    };

    // Call Supabase to update the profile in the database
    const { error } = await supabase
      .from('profiles')
      .update(updatedFields)
      .eq('id', profile.id); // Ensure we only update the logged-in user's profile

    setIsSaving(false);

    if (error) {
      setMessage({ text: `Error updating profile: ${error.message}`, type: 'error' });
    } else {
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      // The AuthProvider will automatically refetch the user data on the next page load
      // or we can manually trigger a refresh if needed.
    }
    window.scrollTo(0, 0);
    setTimeout(() => setMessage(null), 3000);
  };

  if (isAuthLoading) {
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
        <aside>
          <ProfileSidebar user={profile} />
        </aside>
        <main>
          <Card>
            {message && <Message type={message.type}>{message.text}</Message>}
            <Tabs tabs={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'profile' && (
              <div className={styles.tabContent}>
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
                    label="Custom Picture URL"
                    htmlFor="custom_picture_url"
                    footnote="Optional. Overrides Gravatar."
                  >
                    <Input id="custom_picture_url" value={formData.custom_picture_url || ''} onChange={handleInputChange} disabled={isSaving} />
                  </FormGroup>
                  <FormGroup
                    label="Email"
                    htmlFor="email"
                    footnote="Used for your Gravatar. Cannot be changed."
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