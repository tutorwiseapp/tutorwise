import React from 'react';
import Button from '@/app/components/ui/actions/Button'; // Assuming generic button exists
import styles from './HubEmptyState.module.css';

interface HubEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode; // Optional custom icon
}

export const HubEmptyState = ({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon 
}: HubEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-gray-200 rounded-lg text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {title}
      </h3>
      
      <p className="text-gray-500 max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};