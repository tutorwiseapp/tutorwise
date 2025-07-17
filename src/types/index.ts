import React from 'react';

export interface User {
  id: number;
  displayName: string;
  email: string;
  agentId: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  categories?: string;
  achievements?: string;
  customPictureUrl?: string;
  coverPhotoUrl?: string;
  createdAt?: string; // --- THIS IS THE FIX ---
  roles?: string[]; // Added for role-based logic
}

// ... (The rest of your types/index.ts file remains the same)
export interface Referral {
    id: number;
    date: string;
    seeker: string;
    agent: string;
    provider: string;
    type: string;
    channel: string;
    amount: number;
    status: 'Open' | 'Shared' | 'Visited' | 'Signed Up' | 'Booked' | 'Accepted' | 'Declined' | 'Paid' | 'Pending' | 'Failed';
}
export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T;
  responsiveClass?: 'mobile' | 'tablet' | 'desktop';
  cell?: (value: T[keyof T], row: T) => React.ReactNode;
}
export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
}