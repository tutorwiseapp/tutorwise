// Shared types across Tutorwise applications
export interface User {
  id: string;
  email: string;
  full_name?: string; // Full legal name (required for tutors)
  first_name?: string;
  last_name?: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export type UserRole = 'agent' | 'provider' | 'seeker';

// Export type modules
export * from './listing';
