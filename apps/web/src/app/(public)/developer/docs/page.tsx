/**
 * Filename: apps/web/src/app/(public)/developer/docs/page.tsx
 * Purpose: Public API documentation page
 * Created: 2025-12-16
 *
 * Features:
 * - Platform API documentation
 * - Code examples
 * - Getting started guide
 * - Links to API key management
 */
'use client';

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function DeveloperDocsPage() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>TutorWise Platform API</h1>
          <p className={styles.heroSubtitle}>
            Programmatic access to CaaS scores, profiles, bookings, and referrals
          </p>
          <div className={styles.heroActions}>
            <Link href="/developer/api-keys" className={styles.primaryButton}>
              Get API Key
            </Link>
            <a
              href="https://github.com/tutorwiseapp/tutorwise/tree/main/docs/feature/api"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryButton}
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <section className={styles.section}>
        <h2>Quick Start</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Get an API Key</h3>
            <p>
              <Link href="/developer/api-keys">Generate an API key</Link> from your
              developer dashboard with the scopes you need.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Make Your First Request</h3>
            <p>
              Use your API key as a Bearer token in the Authorization header to
              authenticate requests.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Start Building</h3>
            <p>
              Integrate TutorWise data into your app, AI agent, or analytics
              platform.
            </p>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className={styles.section}>
        <h2>Authentication</h2>
        <p>
          All API requests must include your API key in the <code>Authorization</code>{' '}
          header as a Bearer token:
        </p>
        <pre className={styles.code}>
          {`Authorization: Bearer tutorwise_sk_xxx...`}
        </pre>

        <div className={styles.exampleBlock}>
          <h3>Example Request</h3>
          <pre className={styles.code}>
            {`curl -X GET https://tutorwise.com/api/v1/caas/PROFILE_ID \\
  -H "Authorization: Bearer tutorwise_sk_xxx..."`}
          </pre>
        </div>
      </section>

      {/* Available Endpoints */}
      <section className={styles.section}>
        <h2>Available Endpoints</h2>

        <div className={styles.endpointsGrid}>
          {/* CaaS Endpoint */}
          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge}>GET</span>
              <code className={styles.endpointPath}>/api/v1/caas/:profile_id</code>
            </div>
            <p className={styles.endpointDescription}>
              Get CaaS (Credibility as a Service) score for a user with detailed
              breakdown of performance, qualifications, network, safety, and digital
              professionalism.
            </p>
            <div className={styles.endpointMeta}>
              <span className={styles.scopeBadge}>caas:read</span>
            </div>
          </div>

          {/* Profiles Endpoint */}
          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge}>GET</span>
              <code className={styles.endpointPath}>/api/v1/profiles/:id</code>
            </div>
            <p className={styles.endpointDescription}>
              Get public profile information including bio, location, listings, and
              optionally CaaS score and performance stats.
            </p>
            <div className={styles.endpointMeta}>
              <span className={styles.scopeBadge}>profiles:read</span>
            </div>
          </div>

          {/* Bookings Endpoint */}
          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge}>GET</span>
              <code className={styles.endpointPath}>/api/v1/bookings</code>
            </div>
            <p className={styles.endpointDescription}>
              Get authenticated user&apos;s bookings with filters for status, date range,
              and role (tutor or client).
            </p>
            <div className={styles.endpointMeta}>
              <span className={styles.scopeBadge}>bookings:read</span>
            </div>
          </div>

          {/* Referrals Create */}
          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={`${styles.methodBadge} ${styles.methodPost}`}>
                POST
              </span>
              <code className={styles.endpointPath}>/api/v1/referrals/create</code>
            </div>
            <p className={styles.endpointDescription}>
              Create a referral programmatically and optionally send an invitation
              email to the referred person.
            </p>
            <div className={styles.endpointMeta}>
              <span className={styles.scopeBadge}>referrals:write</span>
            </div>
          </div>

          {/* Referrals Stats */}
          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge}>GET</span>
              <code className={styles.endpointPath}>/api/v1/referrals/stats</code>
            </div>
            <p className={styles.endpointDescription}>
              Get referral performance statistics including conversion rates,
              commission earned, and attribution breakdown.
            </p>
            <div className={styles.endpointMeta}>
              <span className={styles.scopeBadge}>referrals:read</span>
            </div>
          </div>

          {/* Tutors Search */}
          <div className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={`${styles.methodBadge} ${styles.methodPost}`}>
                POST
              </span>
              <code className={styles.endpointPath}>/api/v1/tutors/search</code>
            </div>
            <p className={styles.endpointDescription}>
              Search for tutors with automatic referral link attribution. Results
              include referral links for commission tracking.
            </p>
            <div className={styles.endpointMeta}>
              <span className={styles.scopeBadge}>tutors:search</span>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className={styles.section}>
        <h2>Use Cases</h2>

        <div className={styles.useCasesGrid}>
          <div className={styles.useCase}>
            <h3>🤖 AI Agents</h3>
            <p>
              Integrate with ChatGPT, Claude, or custom AI assistants to enable users
              to search tutors, create referrals, and track bookings via natural
              language.
            </p>
          </div>

          <div className={styles.useCase}>
            <h3>🏢 Partner Platforms</h3>
            <p>
              Display TutorWise tutor profiles on external marketplaces with
              credibility scores and automatic referral attribution.
            </p>
          </div>

          <div className={styles.useCase}>
            <h3>📊 Analytics Tools</h3>
            <p>
              Build custom dashboards and reports using booking data, referral
              statistics, and CaaS scores.
            </p>
          </div>

          <div className={styles.useCase}>
            <h3>✅ Credibility Verification</h3>
            <p>
              Verify tutor credibility programmatically using CaaS scores for
              background checks and quality assurance.
            </p>
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className={styles.section}>
        <h2>Rate Limits</h2>
        <p>All API keys are subject to the following rate limits:</p>
        <ul className={styles.rateList}>
          <li>
            <strong>60 requests per minute</strong> - Rolling window
          </li>
          <li>
            <strong>10,000 requests per day</strong> - Resets at midnight UTC
          </li>
        </ul>
        <p className={styles.note}>
          Rate limit information is included in response headers:{' '}
          <code>X-RateLimit-Limit</code> and <code>X-RateLimit-Reset</code>
        </p>
      </section>

      {/* Full Documentation */}
      <section className={`${styles.section} ${styles.ctaSection}`}>
        <h2>Full API Documentation</h2>
        <p>
          For complete endpoint specifications, error codes, code examples, and
          advanced usage, see the full Platform API Guide:
        </p>
        <div className={styles.ctaActions}>
          <a
            href="https://github.com/tutorwiseapp/tutorwise/blob/main/docs/feature/api/PLATFORM_API_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.primaryButton}
          >
            View Full Documentation
          </a>
          <Link href="/developer/api-keys" className={styles.secondaryButton}>
            Manage API Keys
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          Questions? Contact us at{' '}
          <a href="mailto:api@tutorwise.com">api@tutorwise.com</a>
        </p>
        <p className={styles.footerMeta}>
          API Version: v2.0 • Last Updated: 2025-12-16
        </p>
      </footer>
    </div>
  );
}
