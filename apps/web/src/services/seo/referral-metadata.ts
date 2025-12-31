/**
 * Filename: src/services/seo/referral-metadata.ts
 * Purpose: Generates metadata that preserves referral attribution while maintaining SEO best practices
 * Created: 2025-12-31
 *
 * Key Principles:
 * - Canonical URLs NEVER include referral params (avoids duplicate content)
 * - OpenGraph URLs CAN include referral params (for social sharing attribution)
 * - Alternate links preserve referral attribution without affecting canonical
 */

export interface ReferralMetadataOptions {
  baseUrl: string;
  referralCode?: string;
  referralSource?: 'organic' | 'direct' | 'referral' | 'ai-citation';
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

export interface AlternateLink {
  rel: string;
  href: string;
  title?: string;
}

/**
 * Referral-Aware Metadata Generator
 *
 * Ensures SEO best practices while preserving referral attribution:
 * - Canonical = clean URL (no params)
 * - OG URL = can include ref param for social tracking
 * - Alternate links = preserve referral context
 */
export class ReferralMetadataGenerator {
  /**
   * Generate canonical URL that excludes ALL query parameters
   *
   * Google treats URLs with different query params as different pages.
   * Canonical tells Google which version is the "master" version.
   * We ALWAYS strip referral and UTM params from canonical.
   *
   * Example:
   * Input: https://tutorwise.io/public-profile/123/john-smith?ref=ABC123&utm_source=email
   * Output: https://tutorwise.io/public-profile/123/john-smith
   */
  generateCanonicalUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    url.search = ''; // Strip all query params
    return url.toString();
  }

  /**
   * Generate alternate links for referral tracking
   *
   * Alternate links tell search engines about other versions of the page.
   * This helps preserve referral attribution in social contexts while
   * keeping the canonical clean.
   *
   * Example:
   * [
   *   { rel: 'alternate', href: 'https://tutorwise.io/profile/123?ref=ABC', title: 'Referral Link' }
   * ]
   */
  generateAlternateLinks(baseUrl: string, params: ReferralMetadataOptions): AlternateLink[] {
    if (!params.referralCode) return [];

    return [
      {
        rel: 'alternate',
        href: `${baseUrl}?ref=${params.referralCode}`,
        title: 'Referral Link',
      },
    ];
  }

  /**
   * Add referral attribution to Open Graph URL
   *
   * OpenGraph is used for social media previews (Facebook, Twitter, LinkedIn).
   * Unlike canonical, we CAN include referral params in OG URL because:
   * - Social shares preserve the referral link
   * - Search engines don't penalize OG URL params
   * - Helps track referral conversions from social
   *
   * Example:
   * Input: https://tutorwise.io/profile/123
   * + ref=ABC123
   * Output: https://tutorwise.io/profile/123?ref=ABC123
   */
  addReferralAttribution(ogUrl: string, params: ReferralMetadataOptions): string {
    if (!params.referralCode) return ogUrl;

    const url = new URL(ogUrl);
    url.searchParams.set('ref', params.referralCode);

    // Optionally add UTM params for campaign tracking
    if (params.utmParams) {
      if (params.utmParams.source) {
        url.searchParams.set('utm_source', params.utmParams.source);
      }
      if (params.utmParams.medium) {
        url.searchParams.set('utm_medium', params.utmParams.medium);
      }
      if (params.utmParams.campaign) {
        url.searchParams.set('utm_campaign', params.utmParams.campaign);
      }
    }

    return url.toString();
  }

  /**
   * Generate complete metadata for referral-aware pages
   *
   * Returns both canonical (clean) and OG (with referral) URLs.
   * Use this in generateMetadata() for Next.js pages.
   *
   * Example:
   * const metadata = generator.generateMetadata({
   *   baseUrl: 'https://tutorwise.io/profile/123',
   *   referralCode: 'ABC123'
   * });
   *
   * Returns:
   * {
   *   canonical: 'https://tutorwise.io/profile/123',
   *   og: 'https://tutorwise.io/profile/123?ref=ABC123',
   *   alternates: [{ rel: 'alternate', href: '...', title: '...' }]
   * }
   */
  generateMetadata(params: ReferralMetadataOptions) {
    const canonical = this.generateCanonicalUrl(params.baseUrl);
    const ogUrl = this.addReferralAttribution(canonical, params);
    const alternates = this.generateAlternateLinks(params.baseUrl, params);

    return {
      canonical,
      ogUrl,
      alternates,

      // Additional metadata for Next.js Metadata API
      metadata: {
        alternates: {
          canonical,
        },
        openGraph: {
          url: ogUrl,
        },
      },
    };
  }

  /**
   * Extract referral params from URL
   *
   * Useful for server components that need to detect referral context.
   * Returns null if no referral params present.
   *
   * Example:
   * Input: https://tutorwise.io/profile/123?ref=ABC123&utm_source=email
   * Output: { referralCode: 'ABC123', utmParams: { source: 'email' } }
   */
  extractReferralParams(url: string): ReferralMetadataOptions | null {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      const referralCode = params.get('ref') || params.get('referral');
      const utmSource = params.get('utm_source');
      const utmMedium = params.get('utm_medium');
      const utmCampaign = params.get('utm_campaign');

      if (!referralCode && !utmSource) {
        return null;
      }

      return {
        baseUrl: `${urlObj.origin}${urlObj.pathname}`,
        referralCode: referralCode || undefined,
        utmParams: (utmSource || utmMedium || utmCampaign) ? {
          source: utmSource || undefined,
          medium: utmMedium || undefined,
          campaign: utmCampaign || undefined,
        } : undefined,
      };
    } catch (error) {
      console.error('Error extracting referral params:', error);
      return null;
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const referralMetadata = new ReferralMetadataGenerator();

/**
 * Convenience function for generating referral-aware metadata
 *
 * Usage in Next.js generateMetadata():
 * export async function generateMetadata({ params, searchParams }: Props) {
 *   const url = `https://tutorwise.io/profile/${params.id}`;
 *   const referralCode = searchParams?.ref;
 *
 *   const { canonical, ogUrl } = generateReferralMetadata({
 *     baseUrl: url,
 *     referralCode
 *   });
 *
 *   return {
 *     alternates: { canonical },
 *     openGraph: { url: ogUrl }
 *   };
 * }
 */
export function generateReferralMetadata(params: ReferralMetadataOptions) {
  return referralMetadata.generateMetadata(params);
}
