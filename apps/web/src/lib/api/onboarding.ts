/**
 * Onboarding API client
 * Handles saving and retrieving user onboarding progress
 */

import { createClient } from '@/utils/supabase/client';
import { SaveProgressPayload, OnboardingProgressResponse } from '@/types';

/**
 * Save onboarding progress (auto-save support)
 */
export async function saveOnboardingProgress(
  payload: SaveProgressPayload
): Promise<OnboardingProgressResponse> {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/save-onboarding-progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to save progress: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get saved onboarding progress for a specific role
 */
export async function getOnboardingProgress(
  roleType: 'tutor' | 'client' | 'agent'
): Promise<OnboardingProgressResponse | null> {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`/api/onboarding/progress/${roleType}`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  // 404 means no progress saved yet - this is normal
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to get progress: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete onboarding progress (useful for reset)
 */
export async function deleteOnboardingProgress(
  roleType: 'tutor' | 'client' | 'agent'
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`/api/onboarding/progress/${roleType}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to delete progress: ${response.statusText}`);
  }

  return response.json();
}
