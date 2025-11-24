/*
 * Filename: src/app/components/wiselists/WiselistCard.tsx
 * Purpose: Display wiselist in card format (SDD v3.6)
 * Created: 2025-11-15
 * Updated: 2025-11-24 - Migrated to HubRowCard standard
 * Specification: SDD v3.6 - Horizontal card layout with HubRowCard component
 */
'use client';

import Link from 'next/link';
import { Wiselist } from '@/types';
import HubRowCard from '@/app/components/ui/hub-row-card/HubRowCard';
import Button from '@/app/components/ui/Button';

interface WiselistCardProps {
  wiselist: Wiselist;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
}

export default function WiselistCard({
  wiselist,
  onDelete,
  onShare,
}: WiselistCardProps) {
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

  // Map visibility to HubRowCard status variant
  const getStatusVariant = (): 'success' | 'neutral' => {
    return isPublic ? 'success' : 'neutral';
  };

  const getStatusLabel = (): string => {
    return isPublic ? 'Public' : 'Private';
  };

  // Build metadata array
  const meta = [
    `Updated ${formatDate(wiselist.updated_at || wiselist.created_at)}`,
    `${wiselist.collaborator_count || 0} Collaborators`,
  ];

  // Build stats (Item count)
  const itemCount = wiselist.item_count || 0;
  const stats = (
    <div className="flex flex-col items-end">
      <span className="text-2xl font-bold text-gray-900">{itemCount}</span>
      <span className="text-xs text-gray-500 uppercase">
        {itemCount === 1 ? 'Item' : 'Items'}
      </span>
    </div>
  );

  // Handle delete with confirmation
  const handleDelete = () => {
    if (!onDelete) return;
    if (confirm(`Delete "${wiselist.name}"? This action cannot be undone.`)) {
      onDelete(wiselist.id);
    }
  };

  // Build actions
  const actions = (
    <>
      {/* Edit button wrapped in Link */}
      <Link href={`/wiselists/${wiselist.id}`}>
        <Button variant="secondary" size="sm">
          Edit
        </Button>
      </Link>

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

  return (
    <HubRowCard
      image={{
        src: null,
        alt: wiselist.name,
        fallbackChar: getInitials(wiselist.name),
      }}
      title={wiselist.name}
      status={{
        label: getStatusLabel(),
        variant: getStatusVariant(),
      }}
      description={wiselist.description || undefined}
      meta={meta}
      stats={stats}
      actions={actions}
      imageHref={`/wiselists/${wiselist.id}`}
      titleHref={`/wiselists/${wiselist.id}`}
    />
  );
}
