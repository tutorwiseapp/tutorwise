/**
 * Developer API utilities
 * Handles Platform API key management
 */

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  description: string | null;
  scopes: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  total_requests: number;
  created_at: string;
  revoked_at: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  description?: string;
  scopes: string[];
}

export interface CreateApiKeyResponse {
  api_key: string;
  key_prefix: string;
  scopes: string[];
}

/**
 * Get all API keys for the current user
 */
export async function getMyApiKeys(): Promise<ApiKey[]> {
  const response = await fetch('/api/developer/api-keys');
  if (!response.ok) {
    throw new Error('Failed to load API keys');
  }

  const data = await response.json();
  return data.api_keys || [];
}

/**
 * Create a new API key
 */
export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResponse> {
  const response = await fetch('/api/developer/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create API key');
  }

  return response.json();
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  const response = await fetch(`/api/developer/api-keys/${keyId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to revoke API key');
  }
}
