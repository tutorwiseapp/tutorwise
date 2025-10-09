'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { searchListings } from '@/lib/api/listings';
import type { Listing, ListingFilters } from '@tutorwise/shared-types';
import SearchFilters from '@/app/components/marketplace/SearchFilters';
import ListingCard from '@/app/components/marketplace/ListingCard';

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ListingFilters>({
    subjects: searchParams?.get('subjects')?.split(',').filter(Boolean) || [],
    levels: searchParams?.get('levels')?.split(',').filter(Boolean) || [],
    location_type: searchParams?.get('location_type') as any || undefined,
    min_price: searchParams?.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams?.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    search: searchParams?.get('q') || undefined,
  });

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    loadListings();
  }, [filters, currentPage]);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const result = await searchListings({
        filters,
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        sort: {
          field: 'created_at',
          order: 'desc',
        },
      });
      setListings(result.listings);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: ListingFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <Container>
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Find Your Perfect Tutor</h1>
          <p className="mt-2 text-lg text-gray-600">
            Browse {totalCount} verified tutors across all subjects and levels
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                {(filters.subjects?.length || filters.levels?.length || filters.search) && (
                  <Button
                    variant="secondary"
                    onClick={handleClearFilters}
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </Card>
          </aside>

          {/* Listings Grid */}
          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tutors found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or search terms
                </p>
                <Button onClick={handleClearFilters}>Clear filters</Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={page === currentPage ? 'primary' : 'secondary'}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 text-gray-400">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </Container>
  );
}
