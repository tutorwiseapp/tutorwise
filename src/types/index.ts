// types/index.ts
import React from 'react'; // Import React for React.ReactNode

export interface User {
  id: number;
  agentId: string;
  displayName: string;
  email: string;
  bio?: string;
  categories?: string;
  achievements?: string;
  customPictureUrl?: string;
  coverPhotoUrl?: string;
}

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
  responsiveClass?: 'mobile' | 'tablet' | 'desktop'; // Optional for clarity
  // Corrected: Cell value can be any type, and row is the full object T
  cell?: (value: T[keyof T], row: T) => React.ReactNode;
}

// Corrected: Add the missing DataTableProps type
export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
}