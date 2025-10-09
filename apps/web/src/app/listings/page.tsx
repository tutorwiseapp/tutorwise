'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { getMyListings, deleteListing, publishListing, unpublishListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import { toast } from 'sonner';

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUserProfile();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login?redirect=/listings');
      return;
    }

    if (user) {
      loadListings();
    }
  }, [user, userLoading, router]);

  const loadListings = async () => {
    try {
      const data = await getMyListings();
      setListings(data);
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted');
    } catch (error) {
      console.error('Failed to delete listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const handleToggleStatus = async (listing: Listing) => {
    try {
      if (listing.status === 'published') {
        await unpublishListing(listing.id);
        toast.success('Listing unpublished');
      } else {
        await publishListing(listing.id);
        toast.success('Listing published');
      }
      await loadListings();
    } catch (error) {
      console.error('Failed to update listing status:', error);
      toast.error('Failed to update listing status');
    }
  };

  if (userLoading || isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your listings...</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
            <p className="mt-2 text-gray-600">Manage your tutoring service listings</p>
          </div>
          <Link href="/listings/create">
            <Button>+ Create New Listing</Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You haven't created any listings yet</p>
              <Link href="/listings/create">
                <Button>Create Your First Listing</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {listings.map(listing => (
              <Card key={listing.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{listing.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        listing.status === 'published' ? 'bg-green-100 text-green-800' :
                        listing.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {listing.status}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{listing.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Subjects:</span> {listing.subjects.join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Levels:</span> {listing.levels.join(', ')}
                      </div>
                      {listing.hourly_rate && (
                        <div>
                          <span className="font-medium">Rate:</span> £{listing.hourly_rate}/hr
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Type:</span> {listing.location_type}
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm text-gray-500 mt-2">
                      <div>👁 {listing.view_count} views</div>
                      <div>💬 {listing.inquiry_count} inquiries</div>
                      <div>📅 {listing.booking_count} bookings</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link href={`/listings/${listing.id}/edit`}>
                      <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleStatus(listing)}
                    >
                      {listing.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(listing.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
