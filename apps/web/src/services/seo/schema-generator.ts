/**
 * Filename: src/services/seo/schema-generator.ts
 * Purpose: Generate Schema.org JSON-LD markup for SEO
 * Created: 2025-12-29
 *
 * Generates structured data for:
 * - Article (hubs and spokes)
 * - BreadcrumbList
 * - Organization
 * - WebPage
 * - HowTo
 * - FAQPage
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
