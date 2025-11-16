/**
 * Filename: ShareCollaborateWidget.tsx
 * Purpose: Widget for sharing wiselist and managing collaborators (v5.7)
 * Path: /app/components/wiselists/ShareCollaborateWidget.tsx
 * Created: 2025-11-15
 */

'use client';

import React, { useState } from 'react';
import { Share2, Users, Copy, Check, Mail } from 'lucide-react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import Button from '@/app/components/ui/Button';
import { toast } from 'react-hot-toast';
import styles from '@/app/components/layout/sidebars/ContextualSidebar.module.css';

interface ShareCollaborateWidgetProps {
  wiselistId: string;
  slug?: string | null;
  visibility: 'private' | 'public';
  isOwner: boolean;
  onVisibilityChange?: (visibility: 'private' | 'public') => void;
}

export function ShareCollaborateWidget({
  wiselistId,
  slug,
  visibility,
  isOwner,
  onVisibilityChange,
}: ShareCollaborateWidgetProps) {
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const shareUrl = slug ? `${window.location.origin}/w/${slug}` : null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleMakePublic = async () => {
    if (!isOwner) return;

    try {
      const response = await fetch(`/api/wiselists/${wiselistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'public' }),
      });

      if (!response.ok) throw new Error('Failed to update visibility');

      const { wiselist } = await response.json();
      toast.success('Wiselist is now public!');
      onVisibilityChange?.('public');
    } catch (error) {
      console.error('Make public error:', error);
      toast.error('Failed to make wiselist public');
    }
  };

  const handleInviteCollaborator = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);

    try {
      const response = await fetch(`/api/wiselists/${wiselistId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase(),
          role: 'EDITOR',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite collaborator');
      }

      const data = await response.json();

      if (data.invitation) {
        toast.success('Invitation sent! They will receive an email.');
      } else if (data.collaborator) {
        toast.success('Collaborator added!');
      }

      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error: any) {
      console.error('Invite error:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <>
      {/* Share Widget */}
      {visibility === 'public' && shareUrl ? (
        <SidebarWidget title="Share Wiselist">
          <div className={styles.widgetContent}>
            <p className={styles.widgetText}>
              Anyone with this link can view your wiselist
            </p>

            <div className={styles.shareLink}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={styles.shareLinkInput}
              />
              <button
                onClick={handleCopyLink}
                className={styles.shareLinkButton}
                title="Copy link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </SidebarWidget>
      ) : isOwner ? (
        <SidebarWidget title="Share Wiselist">
          <div className={styles.widgetContent}>
            <p className={styles.widgetText}>
              Make this wiselist public to share it with others
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleMakePublic}
              className={styles.widgetButton}
            >
              <Share2 size={16} />
              Make Public
            </Button>
          </div>
        </SidebarWidget>
      ) : null}

      {/* Collaborate Widget */}
      {isOwner && (
        <SidebarWidget title="Collaborators">
          <div className={styles.widgetContent}>
            {!showInviteForm ? (
              <>
                <p className={styles.widgetText}>
                  Invite others to help curate this wiselist
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowInviteForm(true)}
                  className={styles.widgetButton}
                >
                  <Mail size={16} />
                  Invite Collaborator
                </Button>
              </>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className={styles.formInput}
                    disabled={isInviting}
                  />
                </div>

                <div className={styles.buttonGroup}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                    }}
                    disabled={isInviting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleInviteCollaborator}
                    disabled={isInviting || !inviteEmail.trim()}
                  >
                    {isInviting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SidebarWidget>
      )}
    </>
  );
}
