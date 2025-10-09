'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { getListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import { toast } from 'sonner';

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      loadListing();
    }
  }, [params?.id]);

  const loadListing = async () => {
    if (!params?.id) return;

    setIsLoading(true);
    try {
      const data = await getListing(params.id as string);
      setListing(data);
    } catch (error) {
      console.error('Failed to load listing:', error);
      toast.error('Failed to load listing');
      router.push('/marketplace');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (!listing) {
    return null;
  }

  const locationLabel = {
    online: 'Online',
    in_person: 'In Person',
    hybrid: 'Hybrid',
  }[listing.location_type];

  return (
    <Container>
      <div className="max-w-6xl mx-auto py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to listings
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Description */}
            <Card>
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{listing.title}</h1>

                {/* Subjects and Levels */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {listing.subjects.map((subject) => (
                    <span
                      key={subject}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {subject}
                    </span>
                  ))}
                  {listing.levels.map((level) => (
                    <span
                      key={level}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      {level}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <div className="prose max-w-none">
                  <h2 className="text-xl font-semibold mb-3">About This Tutor</h2>
                  <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
                </div>
              </div>
            </Card>

            {/* Note: teaching_experience, qualifications, and teaching_methods fields
                are not part of the Listing type. These would need to be fetched from
                the profile's role_details if needed. */}

            {/* Specializations */}
            {listing.specializations && listing.specializations.length > 0 && (
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-3">Specializations</h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-800"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <div className="p-6 space-y-6">
                {/* Price */}
                {listing.hourly_rate && (
                  <div className="text-center pb-6 border-b border-gray-200">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      £{listing.hourly_rate}
                      <span className="text-lg font-normal text-gray-600">/hr</span>
                    </div>
                    {listing.free_trial && (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          🎁 Free Trial Available
                          {listing.trial_duration && ` (${listing.trial_duration} mins)`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Location */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Teaching Location</h3>
                  <div className="flex items-center text-gray-900">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <div className="font-medium">{locationLabel}</div>
                      {listing.location_city && (
                        <div className="text-sm text-gray-600">{listing.location_city}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 pb-6 border-b border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Views</span>
                    <span className="font-medium text-gray-900">{listing.view_count}</span>
                  </div>
                  {listing.booking_count > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Bookings</span>
                      <span className="font-medium text-gray-900">{listing.booking_count}</span>
                    </div>
                  )}
                  {listing.response_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Response Time</span>
                      <span className="font-medium text-gray-900">{listing.response_time}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    Book a Lesson
                  </Button>
                  <Button variant="outline" className="w-full">
                    Send Message
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="space-y-2 pt-6 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="h-5 w-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Identity Verified
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="h-5 w-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Background Check Completed
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
}
