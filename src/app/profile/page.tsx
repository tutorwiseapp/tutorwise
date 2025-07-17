'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

import ProfileSidebar from './ProfileSidebar'; 
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button'; // Now used
import Message from '@/app/components/ui/Message';
import FormGroup from '@/app/components/ui/form/FormGroup'; // Added for form structure
import Input from '@/app/components/ui/form/Input';       // Added for form structure
import Textarea from '@/app/components/ui/form/Textarea'; // Added for form structure
import styles from './page.module.css';

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem('vinite_loggedin_user') || 'null');
    if (loggedInUser) {
      setUser(loggedInUser);
    } else {
      router.push('/login');
    }
  }, [router]);

  // --- THIS IS THE FIX ---
  // The handleSaveChanges function is now correctly used by the form's button.
  const handleSaveChanges = () => {
    // In a real app, you would save the updated user data here.
    setMessage({ text: 'Profile saved successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!user) return <Container><div>Loading...</div></Container>;

  return (
    <Container>
      <PageHeader title="Edit Profile" subtitle="Manage your public profile information and settings." />
      {message && <Message type={message.type}>{message.text}</Message>}
      <div className={styles.profileLayout}>
        <ProfileSidebar user={user} />
        <div className={styles.mainContent}>
          <Card>
            {/* --- THIS IS THE FIX --- */}
            {/* The form JSX is now fully restored. */}
            <form className={styles.profileForm} onSubmit={(e) => e.preventDefault()}>
                <FormGroup label="Display Name" htmlFor="displayName">
                    <Input id="displayName" type="text" defaultValue={user.displayName} />
                </FormGroup>
                <FormGroup label="Agent ID" htmlFor="agentId">
                    <Input id="agentId" type="text" defaultValue={user.agentId} readOnly />
                </FormGroup>
                <FormGroup label="Bio" htmlFor="bio">
                    <Textarea id="bio" rows={4} defaultValue={user.bio}></Textarea>
                </FormGroup>
                 <FormGroup label="Specialties" htmlFor="categories">
                    <Input id="categories" type="text" defaultValue={user.categories} placeholder="e.g. SaaS, Tech, Marketing" />
                </FormGroup>
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