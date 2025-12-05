/*
 * Filename: src/app/components/wiselists/WiselistCard.tsx
 * Purpose: Display wiselist in card format with HubDetailCard
 * Created: 2025-11-15
 * Updated: 2025-12-05 - Migrated to HubDetailCard standard with inline editing
 * Specification: Expanded detail card layout with HubDetailCard component
 */
'use client';

import React, { useState } from 'react';
import { Wiselist } from '@/types';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import Button from '@/app/components/ui/actions/Button';

interface WiselistCardProps {
  wiselist: Wiselist;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onUpdate?: (id: string, data: { name: string; description: string }) => void;
}

export default function WiselistCard({
  wiselist,
  onDelete,
  onShare,
  onUpdate,
}: WiselistCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(wiselist.name);
  const [editDescription, setEditDescription] = useState(wiselist.description || '');
  const isPublic = wiselist.visibility === 'public';

  // Get list initials (first letter of first 2 words)
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  // Format date to match application standard
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Map visibility to status variant
  const getStatusVariant = (): 'success' | 'neutral' => {
    return isPublic ? 'success' : 'neutral';
  };

  const getStatusLabel = (): string => {
    return isPublic ? 'Public' : 'Private';
  };

  // Handle delete with confirmation
  const handleDelete = () => {
    if (!onDelete) return;
    if (confirm(`Delete "${wiselist.name}"? This action cannot be undone.`)) {
      onDelete(wiselist.id);
    }
  };

  // Handle edit mode
  const handleStartEdit = () => {
    setEditName(wiselist.name);
    setEditDescription(wiselist.description || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditName(wiselist.name);
    setEditDescription(wiselist.description || '');
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!onUpdate) return;
    if (!editName.trim()) {
      alert('Wiselist name is required');
      return;
    }
    onUpdate(wiselist.id, { name: editName.trim(), description: editDescription.trim() });
    setIsEditing(false);
  };

  // Build details grid
  const itemCount = wiselist.item_count || 0;
  const collaboratorCount = wiselist.collaborator_count || 0;

  const details = [
    { label: 'Visibility', value: getStatusLabel() },
    { label: 'Items', value: `${itemCount}` },
    { label: 'Collaborators', value: `${collaboratorCount}` },
    {
      label: 'Updated',
      value: formatDate(wiselist.updated_at || wiselist.created_at)
    },
    {
      label: 'Created',
      value: formatDate(wiselist.created_at)
    },
  ];

  // Build actions based on edit mode
  const actions = isEditing ? (
    <>
      <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={handleSaveEdit}>
        Save
      </Button>
    </>
  ) : (
    <>
      {/* Edit button */}
      {onUpdate && (
        <Button variant="secondary" size="sm" onClick={handleStartEdit}>
          Edit
        </Button>
      )}

      {/* Share button - always shown if public, disabled if no handler */}
      {isPublic && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onShare?.(wiselist.id)}
          disabled={!onShare}
        >
          Share
        </Button>
      )}

      {/* Delete button - only if handler provided */}
      {onDelete && (
        <Button variant="ghost" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      )}
    </>
  );

  // Render title based on edit mode
  const titleContent = isEditing ? (
    <input
      type="text"
      value={editName}
      onChange={(e) => setEditName(e.target.value)}
      maxLength={100}
      style={{
        width: '100%',
        fontSize: '16px',
        fontWeight: 600,
        padding: '4px 8px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        marginBottom: '4px', // Gap between Name and Description in edit mode
      }}
    />
  ) : (
    wiselist.name
  );

  // Render description based on edit mode
  const descriptionContent = isEditing ? (
    <textarea
      value={editDescription}
      onChange={(e) => setEditDescription(e.target.value)}
      maxLength={500}
      rows={2}
      style={{
        width: '100%',
        fontSize: '14px',
        padding: '4px 8px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        resize: 'vertical',
      }}
      placeholder="Description (optional)"
    />
  ) : (
    wiselist.description || undefined
  );

  return (
    <HubDetailCard
      image={{
        src: null,
        alt: wiselist.name,
        fallbackChar: getInitials(wiselist.name),
      }}
      title={titleContent as string}
      status={{
        label: getStatusLabel(),
        variant: getStatusVariant(),
      }}
      description={descriptionContent}
      details={details}
      actions={actions}
    />
  );
}
