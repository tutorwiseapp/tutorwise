/**
 * Lexi Tools
 *
 * OpenAI-compatible tool calling interface for Lexi.
 * Enables Lexi to perform actions on behalf of users.
 *
 * @module lexi/tools
 */

// Types
export type {
  Tool,
  ToolFunction,
  ToolParameter,
  ToolCall,
  ToolCallResult,
  ToolExecutionContext,
  ToolExecutor as ToolExecutorType,
  ToolDefinition,
  ExplainEdupayArgs,
  CheckReferralStatusArgs,
  GetTutorEarningsArgs,
  GetBookingStatusArgs,
  SearchTutorsArgs,
  GetStudentProgressArgs,
  GetUpcomingLessonsArgs,
  CreateSupportTicketArgs,
} from './types';

// Tool Definitions
export {
  explainEdupay,
  getTutorEarnings,
  checkReferralStatus,
  getBookingStatus,
  getUpcomingLessons,
  searchTutors,
  getStudentProgress,
  createSupportTicket,
  getUserProfile,
  getNotifications,
  getOrganisationStats,
  TOOLS_BY_PERSONA,
  ALL_TOOLS,
  getToolsForPersona,
  getToolByName,
} from './definitions';

// Tool Executor
export { ToolExecutor, toolExecutor } from './executor';
