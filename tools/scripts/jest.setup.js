// jest.setup.js
require('@testing-library/jest-dom');

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  })),
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  }
};

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
  supabaseClient: mockSupabaseClient
}));

// Mock UserProfileContext with a stable default profile
const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  full_name: 'Test User',
  bio: 'A test bio.',
  avatar_url: null,
  is_tutor: true,
  is_client: false,
  is_agent: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  professional_details: {
    tutor: {
      subjects: ['Mathematics', 'Physics'],
      key_stages: ['GCSE', 'A-Level'],
      one_on_one_rate: 50,
      delivery_mode: 'hybrid'
    }
  }
};

const mockSetActiveRole = jest.fn();
const mockRefreshProfile = jest.fn();

jest.mock('@/app/contexts/UserProfileContext', () => ({
  UserProfileProvider: ({ children }) => children,
  useUserProfile: () => ({
    profile: mockProfile,
    user: { id: 'test-user-id', email: 'test@example.com' },
    activeRole: 'tutor',
    setActiveRole: mockSetActiveRole,
    isLoading: false,
    refreshProfile: mockRefreshProfile
  })
}));
