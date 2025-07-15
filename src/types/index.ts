// types/index.ts

export interface User {
  id: number;
  agentId: string;
  displayName: string;
  email: string;
  bio?: string; // Optional property
  categories?: string; // Optional property
  achievements?: string; // Optional property
  customPictureUrl?: string; // Optional property
  coverPhotoUrl?: string; // Optional property
}

// You can add other types here as your app grows
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
  responsiveClass: 'mobile' | 'tablet' | 'desktop';
  cell?: (value: any) => React.ReactNode;
}