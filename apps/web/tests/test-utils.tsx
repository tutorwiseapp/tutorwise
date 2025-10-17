// apps/web/tests/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { UserProfileProvider } from '../src/app/contexts/UserProfileContext';

// Create a wrapper component that provides the UserProfileContext
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProfileProvider>
      {children}
    </UserProfileProvider>
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