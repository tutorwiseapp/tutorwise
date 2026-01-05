/**
 * Filename: /join/[slug]/ApplyButton.tsx
 * Purpose: Client component for Apply to Join button with modal
 * Created: 2026-01-05
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { JoinTeamModal } from '@/components/feature/public-organisation-profile/JoinTeamModal';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface ApplyButtonProps {
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  currentUser: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export function ApplyButton({ organisation, currentUser }: ApplyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    if (!currentUser) {
      toast.error('Please login to apply');
      router.push('/login');
      return;
    }

    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={styles.applyButton}
      >
        <UserPlus size={20} />
        Apply to Join Team
      </button>

      {showModal && currentUser && (
        <JoinTeamModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          organisation={organisation}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
