/**
 * Filename: page.tsx
 * Purpose: Public wiselist page (v5.7 Growth Engine)
 * Path: /w/[slug]
 * Created: 2025-11-15
 *
 * This is the viral sharing endpoint for Wiselists.
 * When users visit /w/[slug], middleware tracks wiselist owner for attribution.
 */

import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { WiselistWithDetails } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

interface PageProps {
  params: { slug: string };
}

export default async function PublicWiselistPage({ params }: PageProps) {
  const { slug } = params;
  const supabase = await createClient();

  // Fetch public wiselist by slug
  const { data: wiselist, error } = await supabase
    .from('wiselists')
    .select(`
      *,
      owner:profiles!profile_id(id, full_name, avatar_url, bio, city),
      items:wiselist_items(
        *,
        profile:profiles(id, full_name, avatar_url, bio, city, slug, headline),
        listing:listings(id, title, description, hourly_rate, slug, subjects, levels)
      ),
      collaborators:wiselist_collaborators(
        *,
        profile:profiles!profile_id(id, full_name, avatar_url)
      )
    `)
    .eq('slug', slug)
    .eq('visibility', 'public')
    .single();

  if (error || !wiselist) {
    notFound();
  }

  const wiselistData = wiselist as unknown as WiselistWithDetails;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            ← Back to TutorWise
          </Link>

          <div className="flex items-start gap-4 mt-4">
            {wiselistData.owner?.avatar_url && (
              <Image
                src={wiselistData.owner.avatar_url}
                alt={wiselistData.owner.full_name || 'Owner'}
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{wiselistData.name}</h1>
              {wiselistData.description && (
                <p className="mt-2 text-gray-600">{wiselistData.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <span>Curated by {wiselistData.owner?.full_name || 'Unknown'}</span>
                {wiselistData.owner?.city && <span>• {wiselistData.owner.city}</span>}
                <span>• {wiselistData.items?.length || 0} {wiselistData.items?.length === 1 ? 'item' : 'items'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {wiselistData.items && wiselistData.items.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wiselistData.items.map((item) => {
              // Render profile card
              if (item.profile) {
                return (
                  <Link
                    key={item.id}
                    href={`/profile/${item.profile.slug || item.profile.id}`}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
                  >
                    <div className="flex items-start gap-4">
                      {item.profile.avatar_url && (
                        <Image
                          src={item.profile.avatar_url}
                          alt={item.profile.full_name || 'Tutor'}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {item.profile.full_name || 'Unknown'}
                        </h3>
                        {item.profile.headline && (
                          <p className="text-sm text-gray-600 mt-1">{item.profile.headline}</p>
                        )}
                        {item.profile.city && (
                          <p className="text-xs text-gray-500 mt-2">{item.profile.city}</p>
                        )}
                        {item.profile.bio && (
                          <p className="text-sm text-gray-700 mt-3 line-clamp-3">{item.profile.bio}</p>
                        )}
                        {item.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 italic">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              }

              // Render listing card
              if (item.listing) {
                return (
                  <Link
                    key={item.id}
                    href={`/marketplace/${item.listing.slug || item.listing.id}`}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900 flex-1">
                          {item.listing.title}
                        </h3>
                        {item.listing.hourly_rate && (
                          <span className="ml-2 text-lg font-bold text-blue-600">
                            £{item.listing.hourly_rate}/hr
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex gap-2">
                        {item.listing.subjects?.[0] && (
                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {item.listing.subjects[0]}
                          </span>
                        )}
                        {item.listing.levels?.[0] && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {item.listing.levels[0]}
                          </span>
                        )}
                      </div>

                      {item.listing.description && (
                        <p className="mt-3 text-sm text-gray-700 line-clamp-3">
                          {item.listing.description}
                        </p>
                      )}

                      {item.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 italic">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              }

              return null;
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">This wiselist is empty.</p>
          </div>
        )}
      </main>

      {/* Footer CTA */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Create your own wiselist
          </h2>
          <p className="text-gray-600 mb-6">
            Save and share your favorite tutors and services
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = params;
  const supabase = await createClient();

  const { data: wiselist } = await supabase
    .from('wiselists')
    .select('name, description, owner:profiles!profile_id(full_name)')
    .eq('slug', slug)
    .eq('visibility', 'public')
    .single();

  if (!wiselist) {
    return {
      title: 'Wiselist Not Found',
    };
  }

  const owner = wiselist.owner as any;

  return {
    title: `${wiselist.name} - Wiselist by ${owner?.full_name || 'Unknown'}`,
    description: wiselist.description || `A curated list of tutors and services by ${owner?.full_name || 'a TutorWise user'}`,
  };
}
