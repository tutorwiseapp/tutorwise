/**
 * Filename: apps/web/src/app/profile/[id]/page.tsx
 * Purpose: DEPRECATED - Redirects to new /public-profile/[id]/[slug] route
 * Created: Legacy route (pre-v4.9)
 * Deprecated: 2025-11-12 (v4.9 redesign)
 *
 * This route is deprecated in favor of the new /public-profile/[id]/[slug] route.
 * It now performs a permanent 301 redirect to maintain backwards compatibility
 * with any existing links that may reference the old route.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { generateSlug } from '@/lib/utils/slugify';

interface OldProfilePageProps {
  params: {
    id: string;
  };
}

export default async function OldProfilePage({ params }: OldProfilePageProps) {
  const supabase = await createClient();

  // Fetch the profile to get the slug
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, slug')
    .eq('id', params.id)
    .single();

  // Generate slug from full_name if no custom slug exists
  const slug = profile?.slug || (profile?.full_name ? generateSlug(profile.full_name) : 'profile');

  // Perform permanent 301 redirect to new route
  redirect(`/public-profile/${params.id}/${slug}`);
}
