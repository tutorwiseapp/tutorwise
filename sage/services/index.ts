/**
 * Sage Services
 *
 * Service layer exports for Sage.
 */

export {
  SageSessionStore,
  sessionStore,
  type SessionStoreConfig,
  type StoredSession,
  type StoredMessage,
} from './session';

export {
  AccessControlService,
  accessControl,
  type UserRelationship,
  type AccessDecision,
} from './access-control';

export {
  ProgressService,
  progressService,
  type ProgressUpdate,
  type ProgressSummary,
} from './progress';

export {
  ReportService,
  reportService,
  type ProgressReport,
  type ReportPeriod,
  type ReportSummary,
  type SubjectReport,
  type ActivityItem,
  type Achievement,
} from './report';
