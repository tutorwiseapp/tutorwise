/**
 * Filename: src/services/seo/schema-generator.ts
 * Purpose: Generate Schema.org JSON-LD markup for SEO
 * Created: 2025-12-29
 * Updated: 2025-12-31 - Added trust-enhanced Person and Product schemas
 *
 * Generates structured data for:
 * - Article (hubs and spokes)
 * - BreadcrumbList
 * - Organization
 * - WebPage
 * - HowTo
 * - FAQPage
 * - Person (tutors/agents with CaaS trust scores)
 * - Product/Service (listings with trust signals)
 */

interface SchemaArticle {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  author: {
    '@type': string;
    name: string;
  };
  publisher: {
    '@type': string;
    name: string;
    logo: {
      '@type': string;
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage: {
    '@type': string;
    '@id': string;
  };
}

interface SchemaBreadcrumb {
  '@context': string;
  '@type': string;
  itemListElement: Array<{
    '@type': string;
    position: number;
    name: string;
    item: string;
  }>;
}

interface SchemaOrganization {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}

interface SchemaPerson {
  '@context': string;
  '@type': string;
  name: string;
  description?: string;
  image?: string;
  url: string;
  jobTitle?: string;
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    bestRating: number;
    worstRating: number;
    ratingCount: number;
  };
  award?: string;
  knowsAbout?: string[];
  telephone?: string;
  email?: string;
  address?: {
    '@type': string;
    addressLocality?: string;
    addressCountry?: string;
  };
}

interface SchemaProduct {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  url: string;
  image?: string;
  offers: {
    '@type': string;
    price: number;
    priceCurrency: string;
    availability: string;
    url: string;
  };
  provider: {
    '@type': string;
    name: string;
    url: string;
    aggregateRating?: {
      '@type': string;
      ratingValue: number;
      bestRating: number;
      ratingCount: number;
    };
  };
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    bestRating: number;
    ratingCount: number;
  };
  category?: string;
  award?: string;
}

/**
 * Generate Article schema for hub or spoke
 */
export function generateArticleSchema(data: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  modifiedAt: string;
  authorName?: string;
}): SchemaArticle {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    author: {
      '@type': 'Organization',
      name: data.authorName || 'Tutorwise',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tutorwise',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tutorwise.io/logo.png',
      },
    },
    datePublished: data.publishedAt,
    dateModified: data.modifiedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.url,
    },
  };
}

/**
 * Generate Breadcrumb schema
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): SchemaBreadcrumb {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/**
 * Generate Organization schema
 */
export function generateOrganizationSchema(): SchemaOrganization {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tutorwise',
    url: 'https://tutorwise.io',
    logo: 'https://tutorwise.io/logo.png',
    sameAs: [
      'https://twitter.com/tutorwise',
      'https://facebook.com/tutorwise',
      'https://linkedin.com/company/tutorwise',
    ],
  };
}

/**
 * Generate HowTo schema
 */
export function generateHowToSchema(data: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; image?: string }>;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: data.name,
    description: data.description,
    step: data.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: {
          '@type': 'ImageObject',
          url: step.image,
        },
      }),
    })),
  };
}

/**
 * Generate FAQ schema
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate Person schema for tutor/agent profile with CaaS trust signals
 *
 * CaaS Score → Schema.org AggregateRating Mapping:
 * - CaaS scores (0-100) are converted to 0-5 star ratings
 * - High trust profiles (≥80) get an "award" badge
 * - Review count provides social proof credibility
 */
export function generatePersonSchema(data: {
  name: string;
  description?: string;
  avatarUrl?: string;
  profileUrl: string;
  role: 'tutor' | 'agent' | 'client';
  city?: string;
  country?: string;
  subjects?: string[];

  // Trust signals
  caasScore?: number;
  reviewCount?: number;
  averageRating?: number;

  // Optional contact (only if public)
  phone?: string;
  email?: string;
}): SchemaPerson {
  const schema: SchemaPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    url: data.profileUrl,
  };

  // Add optional fields
  if (data.description) schema.description = data.description;
  if (data.avatarUrl) schema.image = data.avatarUrl;

  // Job title based on role
  if (data.role === 'tutor') {
    schema.jobTitle = 'Private Tutor';
  } else if (data.role === 'agent') {
    schema.jobTitle = 'Education Agent';
  }

  // Add location
  if (data.city || data.country) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(data.city && { addressLocality: data.city }),
      ...(data.country && { addressCountry: data.country }),
    };
  }

  // Add subjects as knowsAbout
  if (data.subjects && data.subjects.length > 0) {
    schema.knowsAbout = data.subjects;
  }

  // Add contact info (only if explicitly public)
  if (data.phone) schema.telephone = data.phone;
  if (data.email) schema.email = data.email;

  // ===================================================================
  // TRUST-FIRST SEO: Convert CaaS score to AggregateRating
  // ===================================================================
  if (data.caasScore !== undefined && data.reviewCount !== undefined) {
    // Convert CaaS score (0-100) to star rating (0-5)
    const starRating = Math.round((data.caasScore / 20) * 10) / 10;

    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: starRating,
      bestRating: 5,
      worstRating: 1,
      ratingCount: data.reviewCount,
    };

    // Add trust badge for high-scoring profiles
    if (data.caasScore >= 80) {
      schema.award = 'Verified High-Trust Professional';
    } else if (data.caasScore >= 60) {
      schema.award = 'Verified Trusted Professional';
    }
  }

  return schema;
}

/**
 * Generate Product/Service schema for listing with trust signals
 *
 * Trust Integration:
 * - Provider's CaaS score shown as provider.aggregateRating
 * - Listing reviews shown as product.aggregateRating
 * - High-trust providers (≥80) get award badge
 */
export function generateListingSchema(data: {
  title: string;
  description: string;
  listingUrl: string;
  hourlyRate: number;
  serviceType: 'tutoring' | 'consultation' | 'assessment';
  subjects?: string[];

  // Provider info
  providerName: string;
  providerUrl: string;
  providerCaasScore?: number;
  providerReviewCount?: number;

  // Listing reviews (optional, different from provider reviews)
  listingAverageRating?: number;
  listingReviewCount?: number;
}): SchemaProduct {
  const schema: SchemaProduct = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: data.title,
    description: data.description,
    url: data.listingUrl,
    offers: {
      '@type': 'Offer',
      price: data.hourlyRate,
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: data.listingUrl,
    },
    provider: {
      '@type': 'Person',
      name: data.providerName,
      url: data.providerUrl,
    },
  };

  // Add category based on service type
  if (data.serviceType === 'tutoring') {
    schema.category = 'Education & Tutoring';
  } else if (data.serviceType === 'consultation') {
    schema.category = 'Educational Consultation';
  } else if (data.serviceType === 'assessment') {
    schema.category = 'Educational Assessment';
  }

  // ===================================================================
  // TRUST-FIRST SEO: Add provider's CaaS score as aggregateRating
  // ===================================================================
  if (data.providerCaasScore !== undefined && data.providerReviewCount !== undefined) {
    const starRating = Math.round((data.providerCaasScore / 20) * 10) / 10;

    schema.provider.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: starRating,
      bestRating: 5,
      ratingCount: data.providerReviewCount,
    };

    // Add trust badge for high-trust providers
    if (data.providerCaasScore >= 80) {
      schema.award = 'Provided by Verified High-Trust Professional';
    }
  }

  // Add listing-specific reviews (if available)
  if (data.listingAverageRating !== undefined && data.listingReviewCount !== undefined) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.listingAverageRating,
      bestRating: 5,
      ratingCount: data.listingReviewCount,
    };
  }

  return schema;
}

/**
 * Combine multiple schemas
 */
export function combineSchemas(schemas: object[]): string {
  return JSON.stringify(schemas, null, 2);
}

/**
 * Generate complete schema for a hub page
 */
export async function generateHubSchema(hubId: string): Promise<string> {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

  const { data: hub } = await supabase
    .from('seo_hubs')
    .select('*')
    .eq('id', hubId)
    .single();

  if (!hub) {
    throw new Error('Hub not found');
  }

  const schemas: object[] = [];

  // Article schema
  schemas.push(
    generateArticleSchema({
      title: hub.title,
      description: hub.meta_description || hub.description || '',
      url: `https://tutorwise.io/guides/${hub.slug}`,
      publishedAt: hub.published_at || hub.created_at,
      modifiedAt: hub.last_edited_at || hub.updated_at,
    })
  );

  // Breadcrumb schema
  schemas.push(
    generateBreadcrumbSchema([
      { name: 'Home', url: 'https://tutorwise.io' },
      { name: 'Guides', url: 'https://tutorwise.io/guides' },
      { name: hub.title, url: `https://tutorwise.io/guides/${hub.slug}` },
    ])
  );

  // Organization schema
  schemas.push(generateOrganizationSchema());

  return combineSchemas(schemas);
}

/**
 * Generate complete schema for a spoke page
 */
export async function generateSpokeSchema(spokeId: string): Promise<string> {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

  const { data: spoke } = await supabase
    .from('seo_spokes')
    .select('*, seo_hubs(title, slug)')
    .eq('id', spokeId)
    .single();

  if (!spoke) {
    throw new Error('Spoke not found');
  }

  const hubData = spoke.seo_hubs as any;

  const schemas: object[] = [];

  // Article schema
  schemas.push(
    generateArticleSchema({
      title: spoke.title,
      description: spoke.meta_description || spoke.description || '',
      url: `https://tutorwise.io/guides/${hubData.slug}/${spoke.slug}`,
      publishedAt: spoke.published_at || spoke.created_at,
      modifiedAt: spoke.last_edited_at || spoke.updated_at,
    })
  );

  // Breadcrumb schema
  schemas.push(
    generateBreadcrumbSchema([
      { name: 'Home', url: 'https://tutorwise.io' },
      { name: 'Guides', url: 'https://tutorwise.io/guides' },
      { name: hubData.title, url: `https://tutorwise.io/guides/${hubData.slug}` },
      { name: spoke.title, url: `https://tutorwise.io/guides/${hubData.slug}/${spoke.slug}` },
    ])
  );

  // Organization schema
  schemas.push(generateOrganizationSchema());

  return combineSchemas(schemas);
}

/**
 * Generate complete schema for a profile page with trust signals
 */
export async function generateProfileSchema(profileId: string): Promise<string> {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Fetch CaaS score
  const { data: caasData } = await supabase
    .from('caas_scores')
    .select('total_score')
    .eq('user_id', profileId)
    .maybeSingle();

  // Fetch review metrics
  const { data: reviewStats } = await supabase
    .from('profile_reviews')
    .select('rating')
    .eq('reviewee_id', profileId);

  const reviewCount = reviewStats?.length || 0;
  const averageRating = reviewCount > 0
    ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  // Extract subjects from professional_details
  const subjects = profile.professional_details?.subjects || [];

  const schemas: object[] = [];

  // Person schema with trust signals
  schemas.push(
    generatePersonSchema({
      name: profile.full_name,
      description: profile.bio || undefined,
      avatarUrl: profile.avatar_url || undefined,
      profileUrl: `https://tutorwise.io/public-profile/${profile.id}/${profile.slug}`,
      role: profile.active_role as 'tutor' | 'agent' | 'client',
      city: profile.city || undefined,
      country: 'United Kingdom',
      subjects: subjects.length > 0 ? subjects : undefined,
      caasScore: caasData?.total_score,
      reviewCount,
      averageRating,
    })
  );

  // Breadcrumb schema
  schemas.push(
    generateBreadcrumbSchema([
      { name: 'Home', url: 'https://tutorwise.io' },
      { name: 'Tutors', url: 'https://tutorwise.io/tutors' },
      { name: profile.full_name, url: `https://tutorwise.io/public-profile/${profile.id}/${profile.slug}` },
    ])
  );

  // Organization schema
  schemas.push(generateOrganizationSchema());

  return combineSchemas(schemas);
}

/**
 * Generate complete schema for a listing page with trust signals
 */
export async function generateListingSchemaForPage(listingId: string): Promise<string> {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

  // Fetch listing data with provider profile
  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      profiles:profile_id (
        id,
        full_name,
        slug
      )
    `)
    .eq('id', listingId)
    .single();

  if (!listing) {
    throw new Error('Listing not found');
  }

  const provider = listing.profiles as any;

  // Fetch provider's CaaS score
  const { data: caasData } = await supabase
    .from('caas_scores')
    .select('total_score')
    .eq('user_id', provider.id)
    .maybeSingle();

  // Fetch provider's review count
  const { count: reviewCount } = await supabase
    .from('profile_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewee_id', provider.id);

  const schemas: object[] = [];

  // Service schema with trust signals
  schemas.push(
    generateListingSchema({
      title: listing.title,
      description: listing.description || '',
      listingUrl: `https://tutorwise.io/listing/${listing.id}/${listing.slug}`,
      hourlyRate: listing.hourly_rate || 0,
      serviceType: listing.service_type as 'tutoring' | 'consultation' | 'assessment',
      subjects: listing.subjects || undefined,
      providerName: provider.full_name,
      providerUrl: `https://tutorwise.io/public-profile/${provider.id}/${provider.slug}`,
      providerCaasScore: caasData?.total_score,
      providerReviewCount: reviewCount || 0,
    })
  );

  // Breadcrumb schema
  schemas.push(
    generateBreadcrumbSchema([
      { name: 'Home', url: 'https://tutorwise.io' },
      { name: 'Listings', url: 'https://tutorwise.io/listings' },
      { name: listing.title, url: `https://tutorwise.io/listing/${listing.id}/${listing.slug}` },
    ])
  );

  // Organization schema
  schemas.push(generateOrganizationSchema());

  return combineSchemas(schemas);
}
