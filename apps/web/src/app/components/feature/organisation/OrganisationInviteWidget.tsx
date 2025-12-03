/**
 * Filename: OrganisationInviteWidget.tsx
 * Purpose: Invite members to organisation sidebar widget (v6.2)
 * Created: 2025-11-19
 * Design: context-sidebar-ui-design-v2.md Section 2.12
 *
 * Pattern: Complex Action Card with 4-Button Layout
 * Layout:
 * - Teal Header: "Grow Your Organisation"
 * - Description
 * - Primary Button: "Invite Member"
 * - Secondary Split: "Find Tutors" | "Invite by Email"
 * - Secondary Button: "Create Organisation"
 *
 * NO ICONS - Professional aesthetic
 */

'use client';

import React, { useState } from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import OrganisationInviteMemberModal from './OrganisationInviteMemberModal';
import toast from 'react-hot-toast';
import styles from './OrganisationInviteWidget.module.css';

interface OrganisationInviteWidgetProps {
  organisationId?: string; // Optional - undefined when no organisation exists
  className?: string;
  onInviteSent?: () => void;
  onOrganisationCreated?: () => void;
}

export default function OrganisationInviteWidget({
  organisationId,
  className,
  onInviteSent,
  onOrganisationCreated,
}: OrganisationInviteWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'search' | 'email'>('search');

  const handleInviteMember = () => {
    if (!organisationId) {
      toast.error('Please create an organisation first');
      return;
    }
    setModalInitialTab('search');
    setIsModalOpen(true);
  };

  const handleFindTutors = () => {
    if (!organisationId) {
      toast.error('Please create an organisation first');
      return;
    }
    setModalInitialTab('search');
    setIsModalOpen(true);
  };

  const handleInviteByEmail = () => {
    if (!organisationId) {
      toast.error('Please create an organisation first');
      return;
    }
    setModalInitialTab('email');
    setIsModalOpen(true);
  };

  const handleCreateOrganisation = async () => {
    if (organisationId) {
      toast.error('You already have an organisation');
      return;
    }

    // Trigger the creation form in the parent page
    onOrganisationCreated?.();
  };

  const handleModalSuccess = () => {
    onInviteSent?.();
  };

  return (
    <>
      <HubComplexCard className={className}>
        <h3 className={styles.title}>Grow Your Organisation</h3>

        <p className={styles.description}>
          {organisationId
            ? 'Invite tutors and teachers to join your organisation.'
            : 'Create an organisation first to invite members.'}
        </p>

        {/* Primary Action - Full Width */}
        <button
          onClick={handleInviteMember}
          className={`${styles.button} ${styles.primary}`}
        >
          Invite Member
        </button>

        {/* Secondary Actions - Split Row */}
        <div className={styles.buttonRow}>
          <button
            onClick={handleFindTutors}
            className={`${styles.button} ${styles.secondary}`}
          >
            Find Tutors
          </button>
          <button
            onClick={handleInviteByEmail}
            className={`${styles.button} ${styles.secondary}`}
          >
            Invite by Email
          </button>
        </div>

        {/* Primary Action - Full Width */}
        <button
          onClick={handleCreateOrganisation}
          className={`${styles.button} ${styles.primary}`}
        >
          Create Organisation
        </button>
      </HubComplexCard>

      {/* Modal */}
      {organisationId && (
        <OrganisationInviteMemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          organisationId={organisationId}
          initialTab={modalInitialTab}
        />
      )}
    </>
  );
}
