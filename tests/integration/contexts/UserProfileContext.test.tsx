import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserProfileProvider, useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';

// Mock Supabase client
jest.mock('@/utils/supabase/client');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn()
    })),
    insert: jest.fn()
  }))
};

// Test component to access context
const TestComponent = () => {
  const {
    profile,
    user,
    activeRole,
    needsOnboarding,
    showOnboarding,
    updateOnboardingProgress,
    switchRole
  } = useUserProfile();

  return (
    <div>
      <div data-testid="user-id">{user?.id || 'no-user'}</div>
      <div data-testid="profile-id">{profile?.id || 'no-profile'}</div>
      <div data-testid="active-role">{activeRole || 'no-role'}</div>
      <div data-testid="needs-onboarding">{needsOnboarding ? 'true' : 'false'}</div>
      <div data-testid="show-onboarding">{showOnboarding ? 'true' : 'false'}</div>
      <button
        data-testid="update-progress"
        onClick={() => updateOnboardingProgress({ onboarding_completed: true })}
      >
        Complete Onboarding
      </button>
      <button
        data-testid="switch-role"
        onClick={() => switchRole('provider')}
      >
        Switch to Tutor
      </button>
    </div>
  );
};

describe('UserProfileContext Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase as any);

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  it('provides default context values when no user is authenticated', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
      expect(screen.getByTestId('profile-id')).toHaveTextContent('no-profile');
      expect(screen.getByTestId('active-role')).toHaveTextContent('no-role');
      expect(screen.getByTestId('needs-onboarding')).toHaveTextContent('false');
    });
  });

  it('loads user profile and sets onboarding state', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = {
      id: 'user123',
      agent_id: 'agent123',
      display_name: 'Test User',
      email: 'test@example.com',
      roles: ['seeker'],
      created_at: '2023-01-01',
      onboarding_progress: {}
    };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } }
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      }))
    });

    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('user123');
      expect(screen.getByTestId('profile-id')).toHaveTextContent('user123');
      expect(screen.getByTestId('active-role')).toHaveTextContent('seeker');
      expect(screen.getByTestId('needs-onboarding')).toHaveTextContent('true'); // No onboarding_completed
      expect(screen.getByTestId('show-onboarding')).toHaveTextContent('true');
    });
  });

  it('handles completed onboarding state', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = {
      id: 'user123',
      agent_id: 'agent123',
      display_name: 'Test User',
      email: 'test@example.com',
      roles: ['seeker', 'provider'],
      created_at: '2023-01-01',
      onboarding_progress: {
        onboarding_completed: true,
        completed_steps: ['welcome', 'role-selection', 'role-details']
      }
    };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } }
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      }))
    });

    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('needs-onboarding')).toHaveTextContent('false');
      expect(screen.getByTestId('show-onboarding')).toHaveTextContent('false');
    });
  });

  it('updates onboarding progress in database', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = {
      id: 'user123',
      agent_id: 'agent123',
      display_name: 'Test User',
      email: 'test@example.com',
      roles: ['seeker'],
      created_at: '2023-01-01',
      onboarding_progress: {}
    };

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null })
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } }
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      })),
      update: mockUpdate
    });

    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('user123');
    });

    // Trigger onboarding progress update
    act(() => {
      screen.getByTestId('update-progress').click();
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        onboarding_progress: { onboarding_completed: true }
      });
    });
  });

  it('handles role switching with profile updates', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = {
      id: 'user123',
      agent_id: 'agent123',
      display_name: 'Test User',
      email: 'test@example.com',
      roles: ['seeker', 'provider'],
      created_at: '2023-01-01',
      onboarding_progress: { onboarding_completed: true }
    };

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null })
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } }
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      })),
      update: mockUpdate
    });

    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-role')).toHaveTextContent('seeker'); // First role by default
    });

    // Trigger role switch
    act(() => {
      screen.getByTestId('switch-role').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-role')).toHaveTextContent('provider');
    });

    // Check localStorage was updated
    expect(window.localStorage.setItem).toHaveBeenCalledWith('activeRole', 'provider');
  });

  it('handles database errors gracefully', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } }
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile not found' }
          })
        }))
      }))
    });

    // Spy on console.error to suppress error logs in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('user123');
      expect(screen.getByTestId('profile-id')).toHaveTextContent('no-profile');
      expect(screen.getByTestId('active-role')).toHaveTextContent('no-role');
    });

    consoleSpy.mockRestore();
  });

  it('initializes role from localStorage if available', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = {
      id: 'user123',
      agent_id: 'agent123',
      display_name: 'Test User',
      email: 'test@example.com',
      roles: ['seeker', 'provider', 'agent'],
      created_at: '2023-01-01',
      onboarding_progress: { onboarding_completed: true }
    };

    // Mock localStorage to return a saved role
    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'activeRole') return 'provider';
      if (key === 'rolePreferences') return '{"lastActiveRole": "provider"}';
      return null;
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } }
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      }))
    });

    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-role')).toHaveTextContent('provider');
    });
  });
});