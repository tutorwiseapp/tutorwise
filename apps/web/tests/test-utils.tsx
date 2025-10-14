// apps/web/tests/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { UserProfileContext } from '../src/app/contexts/UserProfileContext';

// Define a default mock profile to be used across all tests
const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'A test bio.',
  roles: ['provider'],
  onboarding_progress: { onboarding_completed: true },
  // Add any other fields your components might need
};

// Create a wrapper component that provides the UserProfileContext
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProfileContext.Provider value={{ profile: mockProfile, isLoading: false, user: { id: 'test-user-id' } } as any}>
      {children}
    </UserProfileContext.Provider>
  );
};

// Create the custom render function that uses our provider wrapper
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override the default 'render' method with our custom one
export { customRender as render };