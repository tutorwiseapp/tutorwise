/*
 * Filename: src/app/components/data/DataProvider.tsx
 * Purpose: Centralizes management of mock data (users, referrals, etc.) using localStorage.
 *
 * Change History:
 * C002 - 2025-07-19 : 20:05 - Added updateUser function to persist profile edits.
 * C001 - 25 July 2024 : 10:00 - Initial creation of the DataProvider.
 *
 * Last Modified: 2025-07-19
 * Requirement ID: VIN-A-01.2
 *
 * Change Summary:
 * Added the `updateUser` function. This function takes an updated user profile, finds the corresponding
 * user in the main `users` list by their ID, replaces it, and saves the entire updated list back to
 * localStorage. This enables components like the Profile page to persist changes.
 *
 * Impact Analysis:
 * This is a critical enhancement to our mock data layer, enabling stateful interactions across the app.
 * It is a non-breaking, additive change.
 *
 * Dependencies: "react", "@/types", "@/lib/data/mock"
 */
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Profile } from '@/types';
import { initializeMockData } from '@/lib/data/mock';

interface DataContextType {
  users: User[];
  isLoading: boolean;
  addUser: (newUser: User) => void;
  updateUser: (updatedUser: Profile) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeMockData();
    const usersJSON = localStorage.getItem('vinite_users');
    if (usersJSON) {
      setUsers(JSON.parse(usersJSON));
    }
    setIsLoading(false);
  }, []);

  const addUser = (newUser: User) => {
    const usersJSON = localStorage.getItem('vinite_users');
    const currentUsers = usersJSON ? JSON.parse(usersJSON) : [];
    const updatedUsers = [...currentUsers, newUser];
    localStorage.setItem('vinite_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  const updateUser = useCallback((updatedUser: Profile) => {
    setUsers(prevUsers => {
      const newUsers = prevUsers.map(u => 
        u.id === updatedUser.id ? { ...u, ...updatedUser } : u
      );
      localStorage.setItem('vinite_users', JSON.stringify(newUsers));
      return newUsers;
    });
  }, []);

  const value = { users, isLoading, addUser, updateUser };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
