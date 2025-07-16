import React from 'react';

export interface User {
  id: number;
  agentId: string;
  displayName: string;
  email: string;
  password?: string; // --- THIS IS THE FIX --- The password is now part of the User type.
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
  responsiveClass?: 'mobile' | 'tablet' | 'desktop';
  cell?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
}