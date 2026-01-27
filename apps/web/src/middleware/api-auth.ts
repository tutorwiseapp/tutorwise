/**
 * API Authentication Middleware
 * Purpose: Validates API keys for programmatic access to Tutorwise APIs
 * Created: 2025-12-16
 *
 * Usage:
 * import { withApiAuth } from '@/middleware/api-auth';
 *
 * export async function GET(req: Request) {
 *   return withApiAuth(req, async (context) => {
 *     // context.profileId, context.scopes available here
 *     // Your API logic
 *   });
 * }
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export interface ApiAuthContext {
  profileId: string;
  keyId: string;
  scopes: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Extracts and validates API key from Authorization header
 * Format: "Authorization: Bearer tutorwise_sk_xxx..."
 */
export async function validateApiKeyFromRequest(
  request: Request
): Promise<ApiAuthContext | ApiError> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      error: 'missing_authorization',
      message: 'Authorization header is required. Format: "Authorization: Bearer tutorwise_sk_xxx"',
      statusCode: 401,
    };
  }

  // Extract Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      error: 'invalid_authorization_format',
      message: 'Authorization header must be in format: "Bearer tutorwise_sk_xxx"',
      statusCode: 401,
    };
  }

  const apiKey = parts[1];

  // Validate API key format
  if (!apiKey.startsWith('tutorwise_sk_')) {
    return {
      error: 'invalid_api_key_format',
      message: 'API key must start with "tutorwise_sk_"',
      statusCode: 401,
    };
  }

  // Validate with database
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('validate_api_key', {
      p_api_key: apiKey,
    });

    if (error) {
      console.error('API key validation error:', error);
      return {
        error: 'validation_failed',
        message: 'Failed to validate API key',
        statusCode: 500,
      };
    }

    if (!data || !data.valid) {
      return {
        error: 'invalid_api_key',
        message: data?.error || 'Invalid or expired API key',
        statusCode: 401,
      };
    }

    // Return validated context
    return {
      profileId: data.profile_id,
      keyId: data.key_id,
      scopes: data.scopes || [],
      rateLimitPerMinute: data.rate_limit_per_minute || 60,
      rateLimitPerDay: data.rate_limit_per_day || 10000,
    };
  } catch (err) {
    console.error('API key validation exception:', err);
    return {
      error: 'internal_error',
      message: 'An error occurred during authentication',
      statusCode: 500,
    };
  }
}

/**
 * Checks if API key has required scope
 */
export function hasScope(context: ApiAuthContext, requiredScope: string): boolean {
  return context.scopes.includes(requiredScope);
}

/**
 * Logs API usage for analytics and rate limiting
 */
export async function logApiUsage(
  keyId: string,
  request: Request,
  statusCode: number,
  responseTimeMs: number,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);

    await supabase.from('api_key_usage_logs').insert({
      api_key_id: keyId,
      endpoint: url.pathname,
      method: request.method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      error_message: errorMessage,
    });
  } catch (err) {
    // Log silently to avoid disrupting API response
    console.error('Failed to log API usage:', err);
  }
}

/**
 * Higher-order function to wrap API routes with authentication
 *
 * @param request - The incoming request
 * @param handler - Your API handler function that receives authenticated context
 * @param options - Optional configuration (required scopes, etc.)
 *
 * @example
 * export async function POST(req: Request) {
 *   return withApiAuth(req, async (context) => {
 *     // Your authenticated API logic
 *     return NextResponse.json({ profileId: context.profileId });
 *   }, {
 *     requiredScopes: ['referrals:write']
 *   });
 * }
 */
export async function withApiAuth(
  request: Request,
  handler: (context: ApiAuthContext) => Promise<NextResponse>,
  options?: {
    requiredScopes?: string[];
  }
): Promise<NextResponse> {
  const startTime = Date.now();

  // 1. Validate API key
  const authResult = await validateApiKeyFromRequest(request);

  if ('error' in authResult) {
    // Authentication failed
    const responseTimeMs = Date.now() - startTime;

    return NextResponse.json(
      {
        error: authResult.error,
        message: authResult.message,
      },
      { status: authResult.statusCode }
    );
  }

  const context = authResult as ApiAuthContext;

  // 2. Check required scopes
  if (options?.requiredScopes) {
    const missingScopes = options.requiredScopes.filter(
      (scope) => !hasScope(context, scope)
    );

    if (missingScopes.length > 0) {
      const responseTimeMs = Date.now() - startTime;
      await logApiUsage(
        context.keyId,
        request,
        403,
        responseTimeMs,
        `Missing scopes: ${missingScopes.join(', ')}`
      );

      return NextResponse.json(
        {
          error: 'insufficient_permissions',
          message: `Missing required scopes: ${missingScopes.join(', ')}`,
          required_scopes: options.requiredScopes,
          current_scopes: context.scopes,
        },
        { status: 403 }
      );
    }
  }

  // 3. Execute handler
  try {
    const response = await handler(context);
    const responseTimeMs = Date.now() - startTime;

    // Log successful request
    await logApiUsage(context.keyId, request, response.status, responseTimeMs);

    return response;
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // Log failed request
    await logApiUsage(context.keyId, request, 500, responseTimeMs, errorMessage);

    console.error('API handler error:', err);

    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'An error occurred while processing your request',
      },
      { status: 500 }
    );
  }
}

/**
 * Utility: Check rate limit (simple in-memory implementation)
 * For production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  keyId: string,
  limitPerMinute: number
): { allowed: boolean; resetIn: number } {
  const now = Date.now();
  const key = `${keyId}:${Math.floor(now / 60000)}`; // 1-minute window

  const current = rateLimitStore.get(key) || { count: 0, resetAt: now + 60000 };

  if (now > current.resetAt) {
    // Window expired, reset
    rateLimitStore.delete(key);
    rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
    return { allowed: true, resetIn: 60 };
  }

  if (current.count >= limitPerMinute) {
    // Rate limit exceeded
    const resetIn = Math.ceil((current.resetAt - now) / 1000);
    return { allowed: false, resetIn };
  }

  // Increment count
  current.count += 1;
  rateLimitStore.set(key, current);

  return { allowed: true, resetIn: Math.ceil((current.resetAt - now) / 1000) };
}

/**
 * Middleware wrapper with rate limiting
 */
export async function withApiAuthAndRateLimit(
  request: Request,
  handler: (context: ApiAuthContext) => Promise<NextResponse>,
  options?: {
    requiredScopes?: string[];
  }
): Promise<NextResponse> {
  const authResult = await validateApiKeyFromRequest(request);

  if ('error' in authResult) {
    return NextResponse.json(
      {
        error: authResult.error,
        message: authResult.message,
      },
      { status: authResult.statusCode }
    );
  }

  const context = authResult as ApiAuthContext;

  // Check rate limit
  const rateLimitResult = checkRateLimit(context.keyId, context.rateLimitPerMinute);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Try again in ${rateLimitResult.resetIn} seconds.`,
        limit: context.rateLimitPerMinute,
        reset_in: rateLimitResult.resetIn,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': context.rateLimitPerMinute.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
        },
      }
    );
  }

  // Proceed with authentication check
  return withApiAuth(request, handler, options);
}
