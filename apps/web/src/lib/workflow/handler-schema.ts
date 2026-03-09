/**
 * Handler Schema Registry
 *
 * Maps handler names → typed config field definitions for the PropertiesDrawer
 * Handler Config tab. Used to render dynamic forms without code changes.
 */

export type HandlerFieldType = 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';

export interface HandlerFieldOption {
  value: string;
  label: string;
}

export interface HandlerFieldDef {
  key: string;
  label: string;
  type: HandlerFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: HandlerFieldOption[];   // for type: 'select'
  defaultValue?: string | number | boolean;
}

export interface HandlerSchemaDef {
  label: string;           // human-readable name
  description: string;     // what this handler does
  nodeTypes: string[];     // which node types can use this handler
  fields: HandlerFieldDef[];
}

export const HANDLER_SCHEMAS: Record<string, HandlerSchemaDef> = {
  'tutor_approval_score': {
    label: 'Tutor Approval Score',
    description: 'Scores a tutor profile via CaaS. Auto-approves if above threshold, sends to HITL if borderline.',
    nodeTypes: ['action', 'condition'],
    fields: [
      {
        key: 'caas_threshold',
        label: 'CaaS Threshold (auto-approve above)',
        type: 'number',
        required: true,
        placeholder: '70',
        description: 'Profiles scoring above this are auto-approved. Below sends to Exception Queue.',
        defaultValue: 70,
      },
      {
        key: 'auto_approve_above',
        label: 'High-confidence auto-approve threshold',
        type: 'number',
        required: false,
        placeholder: '85',
        description: 'Profiles above this are approved with no human review at all.',
        defaultValue: 85,
      },
    ],
  },

  'stripe_payout': {
    label: 'Stripe Payout',
    description: 'Triggers a Stripe Connect payout for eligible commission amounts.',
    nodeTypes: ['action'],
    fields: [
      {
        key: 'min_payout_gbp',
        label: 'Minimum payout amount (£)',
        type: 'number',
        required: true,
        placeholder: '10',
        description: 'Commissions below this amount are batched until threshold is reached.',
        defaultValue: 10,
      },
      {
        key: 'stripe_account_field',
        label: 'Context field containing Stripe account ID',
        type: 'text',
        required: true,
        placeholder: 'stripe_connect_id',
        description: 'The execution context field that holds the recipient\'s Stripe Connect account ID.',
      },
      {
        key: 'currency',
        label: 'Currency',
        type: 'select',
        required: false,
        defaultValue: 'gbp',
        options: [
          { value: 'gbp', label: 'GBP (£)' },
          { value: 'usd', label: 'USD ($)' },
          { value: 'eur', label: 'EUR (€)' },
        ],
      },
    ],
  },

  'send_email': {
    label: 'Send Email',
    description: 'Sends a templated email via Resend. Variables are interpolated from execution context.',
    nodeTypes: ['action', 'notification'],
    fields: [
      {
        key: 'template_id',
        label: 'Email template ID',
        type: 'text',
        required: true,
        placeholder: 'tutor_approved',
        description: 'Resend template identifier.',
      },
      {
        key: 'to_field',
        label: 'Recipient context field',
        type: 'text',
        required: true,
        placeholder: 'email',
        description: 'Execution context field containing the recipient email address.',
      },
      {
        key: 'subject',
        label: 'Email subject',
        type: 'text',
        required: true,
        placeholder: 'Your application has been reviewed',
      },
      {
        key: 'from_name',
        label: 'Sender name',
        type: 'text',
        required: false,
        placeholder: 'Tutorwise',
        defaultValue: 'Tutorwise',
      },
    ],
  },

  'send_notification': {
    label: 'Send In-App Notification',
    description: 'Creates an in-app notification via Supabase INSERT + Realtime push.',
    nodeTypes: ['action', 'notification'],
    fields: [
      {
        key: 'title',
        label: 'Notification title',
        type: 'text',
        required: true,
        placeholder: 'Application approved',
      },
      {
        key: 'body',
        label: 'Notification body',
        type: 'textarea',
        required: true,
        placeholder: 'Your tutor application has been approved. Welcome to Tutorwise!',
        description: 'Supports {{context_field}} interpolation.',
      },
      {
        key: 'profile_id_field',
        label: 'Recipient context field',
        type: 'text',
        required: true,
        placeholder: 'profile_id',
        description: 'Execution context field containing the recipient profile UUID.',
      },
      {
        key: 'notification_type',
        label: 'Notification type',
        type: 'select',
        required: false,
        defaultValue: 'info',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'success', label: 'Success' },
          { value: 'warning', label: 'Warning' },
          { value: 'error', label: 'Error' },
        ],
      },
    ],
  },

  'stripe_webhook_verify': {
    label: 'Stripe Webhook Verify',
    description: 'Validates a Stripe webhook signature and passes the event to execution context.',
    nodeTypes: ['trigger', 'action'],
    fields: [
      {
        key: 'event_type',
        label: 'Expected Stripe event type',
        type: 'text',
        required: true,
        placeholder: 'payment_intent.succeeded',
        description: 'e.g. payment_intent.succeeded, checkout.session.completed',
      },
      {
        key: 'secret_env_var',
        label: 'Webhook secret env var name',
        type: 'text',
        required: true,
        placeholder: 'STRIPE_WEBHOOK_SECRET',
        description: 'Name of the environment variable holding the Stripe webhook signing secret.',
      },
    ],
  },

  'supabase_update': {
    label: 'Update Database Record',
    description: 'Updates a Supabase table row using a value from execution context as the row ID.',
    nodeTypes: ['action'],
    fields: [
      {
        key: 'table',
        label: 'Table name',
        type: 'text',
        required: true,
        placeholder: 'profiles',
      },
      {
        key: 'id_field',
        label: 'ID context field',
        type: 'text',
        required: true,
        placeholder: 'profile_id',
        description: 'Execution context field containing the row UUID to update.',
      },
      {
        key: 'updates',
        label: 'Fields to update (JSON)',
        type: 'json',
        required: true,
        placeholder: '{"status": "active"}',
        description: 'JSON object. Values prefixed with $ are resolved from context. e.g. {"status": "$new_status"}',
      },
    ],
  },

  'growth_score_compute': {
    label: 'Compute Growth Score',
    description: 'Computes and caches the Growth Score for a user profile.',
    nodeTypes: ['action'],
    fields: [
      {
        key: 'profile_id_field',
        label: 'Profile ID context field',
        type: 'text',
        required: true,
        placeholder: 'profile_id',
      },
      {
        key: 'role_type',
        label: 'Role type',
        type: 'select',
        required: true,
        options: [
          { value: 'tutor', label: 'Tutor' },
          { value: 'client', label: 'Client' },
          { value: 'agent', label: 'Agent' },
          { value: 'organisation', label: 'Organisation' },
        ],
      },
    ],
  },

  'referral_attribute': {
    label: 'Attribute Referral Commission',
    description: 'Looks up agent_id on a booking and calculates the 80/10/10 commission split.',
    nodeTypes: ['action'],
    fields: [
      {
        key: 'booking_id_field',
        label: 'Booking ID context field',
        type: 'text',
        required: true,
        placeholder: 'booking_id',
      },
    ],
  },

  'cas_agent': {
    label: 'Invoke CAS Agent / Team',
    description: 'Invokes a registered Specialist Agent or Team by slug. Output stored in context.',
    nodeTypes: ['action'],
    fields: [
      {
        key: 'agent_slug',
        label: 'Agent or Team slug',
        type: 'text',
        required: true,
        placeholder: 'market-intelligence',
        description: 'Slug of the specialist_agents or agent_teams record to invoke.',
      },
      {
        key: 'prompt_template',
        label: 'Prompt template',
        type: 'textarea',
        required: false,
        placeholder: 'Analyse the following tutor profile: {{profile_id}}',
        description: 'Supports {{context_field}} interpolation from execution context.',
      },
      {
        key: 'output_field',
        label: 'Context field to store output',
        type: 'text',
        required: false,
        placeholder: 'agent_output',
        description: 'Execution context key where the agent\'s response will be saved.',
      },
    ],
  },

  'http_request': {
    label: 'HTTP Request',
    description: 'Makes an external HTTP call. Response stored in execution context.',
    nodeTypes: ['action', 'trigger'],
    fields: [
      {
        key: 'url',
        label: 'URL',
        type: 'text',
        required: true,
        placeholder: 'https://api.example.com/endpoint',
        description: 'Supports {{context_field}} interpolation.',
      },
      {
        key: 'method',
        label: 'HTTP method',
        type: 'select',
        required: true,
        defaultValue: 'POST',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PATCH', label: 'PATCH' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
        ],
      },
      {
        key: 'body_template',
        label: 'Request body (JSON)',
        type: 'json',
        required: false,
        placeholder: '{"id": "{{profile_id}}"}',
        description: 'JSON body. Supports {{context_field}} interpolation.',
      },
      {
        key: 'auth_env_var',
        label: 'Auth token env var',
        type: 'text',
        required: false,
        placeholder: 'MY_SERVICE_API_KEY',
        description: 'Environment variable name for Bearer auth header.',
      },
      {
        key: 'output_field',
        label: 'Context field to store response',
        type: 'text',
        required: false,
        placeholder: 'http_response',
      },
    ],
  },

  'condition_eval': {
    label: 'Condition Evaluation',
    description: 'Evaluates a JS expression against execution context. Routes to Yes or No branch.',
    nodeTypes: ['condition'],
    fields: [
      {
        key: 'expression',
        label: 'Boolean expression',
        type: 'textarea',
        required: true,
        placeholder: 'context.caas_score >= 70',
        description: 'JavaScript expression. Access context fields via context.field_name. Must return true/false.',
      },
      {
        key: 'context_fields',
        label: 'Context fields used (comma-separated)',
        type: 'text',
        required: false,
        placeholder: 'caas_score, profile_id',
        description: 'For documentation — list the context fields referenced in the expression.',
      },
    ],
  },
};

/** Sorted list of handler names for dropdown menus */
export const HANDLER_NAMES = Object.keys(HANDLER_SCHEMAS).sort();

/** Returns handler schema or null */
export function getHandlerSchema(handler: string): HandlerSchemaDef | null {
  return HANDLER_SCHEMAS[handler] ?? null;
}
