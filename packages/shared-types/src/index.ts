// Shared types across Tutorwise applications
export interface User {
  id: string;
  email: string;
  display_name?: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export type UserRole = 'agent' | 'provider' | 'seeker';

// Export type modules
export * from './listing';
