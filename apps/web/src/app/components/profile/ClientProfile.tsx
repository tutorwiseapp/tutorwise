'use client';

import { useState } from 'react';
import type { Profile } from '@/types';
import Image from 'next/image';
import getProfileImageUrl from '@/lib/utils/image';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import FormGroup from '@/app/components/ui/form/FormGroup';
import styles from './ClientProfile.module.css';

interface ClientProfileProps {
  profile: Profile;
  isEditable?: boolean;
  onSave?: (updatedProfile: Partial<Profile>) => void;
}

export default function ClientProfile({ profile, isEditable = false, onSave = () => {} }: ClientProfileProps) {
  const [fullName, setFullName] = useState(profile.full_name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ full_name: fullName });
  };

  return (
    <div className={styles.profileGrid}>
      <aside>
        <Card className={styles.profileCard}>
          <Image
            src={getProfileImageUrl(profile)}
            alt={`${profile.full_name}'s profile picture`}
            width={150}
            height={150}
            className={styles.profileAvatar}
          />
          <div className={styles.profileBody}>
            <h2 className={styles.profileName}>{profile.full_name}</h2>
          </div>
        </Card>
      </aside>
      <main>
        <Card className={styles.contentCard}>
          <h3>Account Settings</h3>
          <form onSubmit={handleSubmit}>
            <FormGroup label="Full Name" htmlFor="full_name">
              <input
                id="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditable}
              />
            </FormGroup>
            <FormGroup label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                defaultValue={profile.email}
                disabled
              />
            </FormGroup>
            {isEditable && (
              <Button variant="primary" type="submit">Save Changes</Button>
            )}
          </form>
        </Card>
      </main>
    </div>
  );
}
