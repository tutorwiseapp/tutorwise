import type { User } from '@/types';

// This is now the single source of truth for all mock users.
export const mockUsers: User[] = [
  {
    id: 1,
    agentId: 'A1-JS123456',
    displayName: 'Jordan Smith',
    firstName: 'Jordan',
    lastName: 'Smith',
    email: 'jordan.smith@example.com',
    password: 'password123',
    bio: 'A passionate connector and tech enthusiast dedicated to finding the best tools and services for my network. I specialize in SaaS, online education, and freelance resources.',
    categories: 'SaaS, Education, Freelancing, Tech',
    achievements: 'Top Referrer Q1 2025',
    customPictureUrl: 'https://i.pravatar.cc/150?u=A1-JS123456',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1554147090-e1221a04a025?q=80&w=2070&auto=format&fit=crop',
    roles: ['agent', 'seeker'],
  },
  {
    id: 2,
    agentId: 'A1-AGENTB',
    displayName: 'Alex Johnson',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.j@example.com',
    password: 'password123',
    roles: ['agent'],
  },
  {
      id: 3,
      agentId: 'P1-PROVA',
      displayName: 'Provider Alpha',
      firstName: 'Provider',
      lastName: 'Alpha',
      email: 'contact@provideralpha.com',
      password: 'password123',
      roles: ['provider'],
  },
  {
      id: 99,
      agentId: 'ADM-001',
      displayName: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@vinite.com',
      password: 'password123',
      roles: ['admin'],
  }
];

// A utility function to initialize localStorage with our mock data if it's not already there.
export const initializeMockData = () => {
    if (typeof window !== 'undefined') {
        if (!localStorage.getItem('vinite_users')) {
            localStorage.setItem('vinite_users', JSON.stringify(mockUsers));
            console.log('Mock user data initialized in localStorage.');
        }
    }
};