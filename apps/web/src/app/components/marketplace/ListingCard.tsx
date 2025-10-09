'use client';

import Link from 'next/link';
import type { Listing } from '@tutorwise/shared-types';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const locationLabel = {
    online: 'Online',
    in_person: 'In Person',
    hybrid: 'Hybrid',
  }[listing.location_type];

  return (
    <Link href={`/marketplace/${listing.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 mb-2">
              {listing.title}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-3">{listing.description}</p>
          </div>

          {/* Subjects */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {listing.subjects.slice(0, 3).map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {subject}
                </span>
              ))}
              {listing.subjects.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  +{listing.subjects.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Levels */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {listing.levels.slice(0, 3).map((level) => (
                <span
                  key={level}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {level}
                </span>
              ))}
              {listing.levels.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  +{listing.levels.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Location and Price */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
              {locationLabel}
              {listing.location_city && ` · ${listing.location_city}`}
            </div>

            {listing.hourly_rate && (
              <div className="text-lg font-bold text-blue-600">
                £{listing.hourly_rate}
                <span className="text-sm font-normal text-gray-600">/hr</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {listing.view_count} views
            </div>
            {listing.booking_count > 0 && (
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {listing.booking_count} bookings
              </div>
            )}
          </div>

          {/* Free Trial Badge */}
          {listing.free_trial && (
            <div className="mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                🎁 Free Trial Available
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
