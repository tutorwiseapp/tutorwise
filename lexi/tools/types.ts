/**
 * Lexi Tool Types
 *
 * OpenAI-compatible tool calling types for Lexi actions.
 *
 * @module lexi/tools/types
 */

// --- OpenAI-Compatible Tool Types ---

export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: { type: string };
  properties?: Record<string, ToolParameter>;
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

// --- Tool Call Types ---

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolCallResult {
  tool_call_id: string;
  role: 'tool';
  content: string; // JSON string result
}

// --- Tool Execution Types ---

export interface ToolExecutionContext {
  userId: string;
  userRole: string;
  organisationId?: string;
  sessionId: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
}

export type ToolExecutor<T = unknown, R = unknown> = (
  args: T,
  context: ToolExecutionContext
) => Promise<R>;

export interface ToolDefinition<T = unknown, R = unknown> {
  tool: Tool;
  execute: ToolExecutor<T, R>;
  allowedRoles?: string[];
}

// --- Specific Tool Argument Types ---

export interface ExplainEdupayArgs {
  topic?: 'overview' | 'fees' | 'payouts' | 'invoices' | 'refunds';
}

export interface CheckReferralStatusArgs {
  referralCode?: string;
}

export interface GetTutorEarningsArgs {
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
}

export interface GetBookingStatusArgs {
  bookingId: string;
}

export interface SearchTutorsArgs {
  subject?: string;
  level?: string;
  availability?: string;
  maxPrice?: number;
}

export interface GetStudentProgressArgs {
  studentId?: string;
  subject?: string;
}

export interface GetUpcomingLessonsArgs {
  days?: number;
}

export interface CreateSupportTicketArgs {
  category: 'account' | 'billing' | 'bookings' | 'technical' | 'features' | 'other';
  summary: string;
  details?: string;
  priority?: 'low' | 'medium' | 'high';
}
