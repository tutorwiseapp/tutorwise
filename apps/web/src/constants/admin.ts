/**
 * Filename: src/constants/admin.ts
 * Purpose: Centralized constants for admin dashboard
 * Created: 2025-12-30
 */

/**
 * Table and pagination defaults
 */
export const ADMIN_TABLE_DEFAULTS = {
  PAGE_SIZE: 20,
  REFRESH_FAST: 30000, // 30 seconds (for real-time data like bookings)
  REFRESH_SLOW: 300000, // 5 minutes (for slower-changing data like users)
  STALE_TIME: 60000, // 1 minute
} as const;

/**
 * Chart and visualization defaults
 */
export const ADMIN_CHART_DEFAULTS = {
  TREND_DAYS: 7, // Default days for trend charts
  MAX_TREND_DAYS: 90, // Maximum days for trend charts
  CHART_HEIGHT: 300,
  CHART_COLORS: {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#6366f1',
  },
} as const;

/**
 * Search and filter defaults
 */
export const ADMIN_SEARCH_DEFAULTS = {
  DEBOUNCE_MS: 300,
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_RESULTS: 100,
} as const;

/**
 * Status filter options
 */
export const BOOKING_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export const USER_STATUS_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'processing', label: 'Processing' },
] as const;

export const REVIEW_STATUS_OPTIONS = [
  { value: 'all', label: 'All Reviews' },
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Pending' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'removed', label: 'Removed' },
] as const;

export const DISPUTE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Disputes' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
] as const;

/**
 * User type filter options
 */
export const USER_TYPE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'tutor', label: 'Tutors' },
  { value: 'client', label: 'Clients' },
  { value: 'both', label: 'Both' },
] as const;

/**
 * Date range filter options
 */
export const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
] as const;

/**
 * Sort options
 */
export const SORT_OPTIONS = {
  bookings: [
    { value: 'created_at:desc', label: 'Newest First' },
    { value: 'created_at:asc', label: 'Oldest First' },
    { value: 'start_time:desc', label: 'Latest Start Time' },
    { value: 'start_time:asc', label: 'Earliest Start Time' },
    { value: 'total_price:desc', label: 'Highest Price' },
    { value: 'total_price:asc', label: 'Lowest Price' },
  ],
  users: [
    { value: 'created_at:desc', label: 'Newest First' },
    { value: 'created_at:asc', label: 'Oldest First' },
    { value: 'full_name:asc', label: 'Name (A-Z)' },
    { value: 'full_name:desc', label: 'Name (Z-A)' },
    { value: 'last_sign_in:desc', label: 'Recently Active' },
    { value: 'last_sign_in:asc', label: 'Least Active' },
  ],
  reviews: [
    { value: 'created_at:desc', label: 'Newest First' },
    { value: 'created_at:asc', label: 'Oldest First' },
    { value: 'rating:desc', label: 'Highest Rating' },
    { value: 'rating:asc', label: 'Lowest Rating' },
  ],
  disputes: [
    { value: 'created_at:desc', label: 'Newest First' },
    { value: 'created_at:asc', label: 'Oldest First' },
    { value: 'updated_at:desc', label: 'Recently Updated' },
    { value: 'updated_at:asc', label: 'Least Updated' },
  ],
  referrals: [
    { value: 'created_at:desc', label: 'Newest First' },
    { value: 'created_at:asc', label: 'Oldest First' },
    { value: 'reward_amount:desc', label: 'Highest Reward' },
    { value: 'reward_amount:asc', label: 'Lowest Reward' },
  ],
} as const;

/**
 * Action button labels
 */
export const ACTION_LABELS = {
  view: 'View Details',
  edit: 'Edit',
  delete: 'Delete',
  suspend: 'Suspend',
  activate: 'Activate',
  approve: 'Approve',
  reject: 'Reject',
  refund: 'Refund',
  escalate: 'Escalate',
  resolve: 'Resolve',
  flag: 'Flag',
  unflag: 'Unflag',
  publish: 'Publish',
  unpublish: 'Unpublish',
  export: 'Export CSV',
  refresh: 'Refresh',
  filter: 'Filters',
} as const;

/**
 * Empty state messages
 */
export const EMPTY_STATES = {
  bookings: {
    title: 'No bookings found',
    description: 'Try adjusting your filters or search query.',
  },
  users: {
    title: 'No users found',
    description: 'Try adjusting your filters or search query.',
  },
  reviews: {
    title: 'No reviews found',
    description: 'Try adjusting your filters or search query.',
  },
  disputes: {
    title: 'No disputes found',
    description: 'Try adjusting your filters or search query.',
  },
  referrals: {
    title: 'No referrals found',
    description: 'Try adjusting your filters or search query.',
  },
  listings: {
    title: 'No listings found',
    description: 'Try adjusting your filters or search query.',
  },
  messages: {
    title: 'No messages found',
    description: 'Try adjusting your filters or search query.',
  },
  organisations: {
    title: 'No organisations found',
    description: 'Try adjusting your filters or search query.',
  },
  financials: {
    title: 'No financial records found',
    description: 'Try adjusting your filters or date range.',
  },
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  loadFailed: 'Failed to load data. Please try again.',
  actionFailed: 'Action failed. Please try again.',
  invalidInput: 'Invalid input. Please check your data.',
  unauthorized: 'You do not have permission to perform this action.',
  notFound: 'The requested resource was not found.',
  serverError: 'An unexpected error occurred. Please try again later.',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  actionCompleted: 'Action completed successfully.',
  dataSaved: 'Data saved successfully.',
  dataDeleted: 'Data deleted successfully.',
  statusUpdated: 'Status updated successfully.',
  exported: 'Data exported successfully.',
} as const;

/**
 * Validation limits
 */
export const VALIDATION_LIMITS = {
  maxSearchLength: 100,
  maxBulkActions: 50,
  maxExportRows: 10000,
  minRefundAmount: 1,
  maxRefundAmount: 100000,
} as const;

/**
 * Admin role display names
 */
export const ADMIN_ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  systemadmin: 'System Admin',
  supportadmin: 'Support Admin',
} as const;

/**
 * Permission resource display names
 */
export const PERMISSION_RESOURCE_LABELS = {
  seo: 'SEO',
  users: 'Users',
  listings: 'Listings',
  bookings: 'Bookings',
  reviews: 'Reviews',
  referrals: 'Referrals',
  organisations: 'Organisations',
  financials: 'Financials',
  disputes: 'Disputes',
  reports: 'Reports',
  settings: 'Settings',
  integrations: 'Integrations',
  audit_logs: 'Audit Logs',
  messages: 'Messages',
  admins: 'Admins',
} as const;

/**
 * Time format options
 */
export const TIME_FORMATS = {
  date: 'dd/MM/yyyy',
  datetime: 'dd/MM/yyyy HH:mm',
  time: 'HH:mm',
  datetimeShort: 'dd MMM HH:mm',
  dateLong: 'dd MMMM yyyy',
} as const;

/**
 * Currency format options
 */
export const CURRENCY_FORMAT = {
  locale: 'en-GB',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;
