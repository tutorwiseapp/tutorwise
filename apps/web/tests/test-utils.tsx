// apps/web/tests/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileProvider } from '../src/app/contexts/UserProfileContext';

// Create a new QueryClient for each test to avoid cache pollution
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Create a wrapper component that provides all necessary contexts
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileProvider>
        {children}
      </UserProfileProvider>
    </QueryClientProvider>
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