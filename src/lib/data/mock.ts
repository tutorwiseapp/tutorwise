/*
 * Filename: src/lib/data/mock.ts
 * Purpose: Provides the initial mock user data for the application's localStorage.
 *
 * Change History:
 * C002 - 2025-07-19 : 22:45 - Refactored all property names to snake_case.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-19
 *
 * Change Summary:
 * Updated the entire `mockUsers` array to use `snake_case` for all property names (e.g., `agentId` -> `agent_id`).
 * This aligns the mock data with the canonical `Profile` interface defined in `src/types/index.ts`.
 *
 * Impact Analysis:
 * This is a critical fix that resolves the "Agent Not Found" bug on the public profile page. It ensures
 * that the data structure in the mock environment is identical to the one planned for the Supabase backend,
 * preventing data-shape-related bugs across the application.
 *
 * Dependencies:
 * - @/types
 */
import type { User } from '@/types';

// This is the single source of truth for all mock users, now aligned with the Profile interface.
export const mockUsers: User[] = [
  {
    id: 1,
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
  // ... other mock users would also be updated here
];

// This function runs once to set up the data.
export const initializeMockData = () => {
    if (typeof window !== 'undefined') {
        // For testing, you might want to clear old data first
        // localStorage.removeItem('vinite_users');
        if (!localStorage.getItem('vinite_users')) {
            localStorage.setItem('vinite_users', JSON.stringify(mockUsers));
            console.log('%c[MOCK DATA]: Initialized user list in localStorage with snake_case properties.', 'color: green; font-weight: bold;');
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
