/*
 * Filename: src/lib/data/mock.ts
 * Purpose: Provides the initial mock user data for the application's localStorage.
 *
 * Change History:
 * C003 - 2025-07-20 : 15:30 - Corrected mock user ID to be a string to fix build error.
 * C002 - 2025-07-19 : 22:45 - Refactored all property names to snake_case.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-20 : 15:30
 *
 * Change Summary:
 * Changed the hardcoded mock user ID from the number `1` to the string `'1'`. This aligns the
 * mock data with the canonical `Profile` interface, which requires the ID to be a string, and
 * resolves the TypeScript error that was causing the Vercel deployment to fail.
 *
 * Impact Analysis:
 * This change fixes a critical deployment blocker and makes the mock data more representative
 * of the production data from Supabase.
 *
 * Dependencies: "@/types"
 */

import type { User } from '@/types';

// This is the single source of truth for all mock users, now aligned with the Profile interface.
export const mockUsers: User[] = [
  {
    // --- THIS IS THE FIX ---
    // The `id` must be a string to match the canonical `Profile` interface.
    id: '1',
    agent_id: 'A1-JS123456',
    display_name: 'Jordan Smith',
    first_name: 'Jordan',
    last_name: 'Smith',
    email: 'jordan.smith@example.com',
    password: 'password123',
    bio: 'A passionate connector and tech enthusiast dedicated to finding the best tools and services for my network. I specialize in SaaS, online education, and freelance resources.',
    categories: 'SaaS, Education, Freelancing, Tech',
    achievements: 'Top Referrer Q1 2025',
    custom_picture_url: 'https://i.pravatar.cc/150?u=A1-JS123456',
    cover_photo_url: 'https://images.unsplash.com/photo-1554147090-e1221a04a025?q=80&w=2070&auto=format&fit=crop',
    roles: ['agent', 'seeker'],
    created_at: new Date().toISOString(),
  },
  // ... other mock users can be added here
];

// This function runs once to set up the data.
export const initializeMockData = () => {
    if (typeof window !== 'undefined') {
        if (!localStorage.getItem('vinite_users')) {
            localStorage.setItem('vinite_users', JSON.stringify(mockUsers));
            console.log('%c[MOCK DATA]: Initialized user list in localStorage.', 'color: green; font-weight: bold;');
        }
    }
};

// This function directly reads from localStorage whenever it's called.
export const getMockUsers = (): User[] => {
  if (typeof window !== 'undefined') {
    const usersJSON = localStorage.getItem('vinite_users');
    return usersJSON ? JSON.parse(usersJSON) : [];
  }
  return [];
};