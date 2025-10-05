'use client';

import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalInfoPage() {
  const { profile, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login');
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        Personal Information
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Manage your personal details and contact information.
      </p>

      <div style={{ padding: '2rem', background: '#f9fafb', borderRadius: '6px', textAlign: 'center' }}>
        <p>Coming soon: Personal info form</p>
        <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
          This will include: Display name, Avatar, Bio, Location, etc.
        </p>
      </div>
    </div>
  );
}
