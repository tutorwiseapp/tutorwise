/**
 * CAS User API
 *
 * User-facing API modules that expose CAS agent functionality
 * for consumption by Lexi and other user-facing applications.
 *
 * These modules provide a sanitized, permission-checked interface
 * to CAS capabilities, appropriate for end users (students, tutors,
 * clients, organisations).
 *
 * @module cas/user-api
 */

// Re-export context utilities for consumers
export {
  createUserContext,
  createAdminContext,
  isOperationAllowed,
  hasRole,
  hasPermission,
  type AgentContext,
  type UserInfo,
  type UserRole,
} from '../../core/src/context';

// Export Supabase utility
export { getSupabaseClient, isSupabaseAvailable } from './lib/supabase';

// Export modules
export { LearningModuleAPI, learningModule } from './modules/learning-module';
export { BookingModuleAPI, bookingModule } from './modules/booking-module';
export { ProgressModuleAPI, progressModule } from './modules/progress-module';

// Export types from modules
export type {
  LearningResource,
  HomeworkAssignment,
  LearningPath,
  StudyPlan,
} from './modules/learning-module';

export type {
  Booking,
  BookingStatus,
  BookingRequest,
  TutorAvailability,
  TutorProfile,
  TutorSearchFilters,
} from './modules/booking-module';

export type {
  StudentProgress,
  SubjectProgress,
  TutorAnalytics,
  OrgAnalytics,
  Feedback,
  ProgressReport,
} from './modules/progress-module';

// --- Combined API Facade ---

import { learningModule } from './modules/learning-module';
import { bookingModule } from './modules/booking-module';
import { progressModule } from './modules/progress-module';

/**
 * Combined user API - single entry point for all user-facing operations
 */
export const userAPI = {
  learning: learningModule,
  booking: bookingModule,
  progress: progressModule,
};

export default userAPI;
