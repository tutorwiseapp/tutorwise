/**
 * Filename: apps/web/src/app/(public)/terms-of-service/page.tsx
 * Purpose: Terms of Service page rendering markdown content
 * Updated: 2026-01-29
 */

import { Metadata } from 'next';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/data-display/PageHeader';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service | Tutorwise',
  description: 'Read the Tutorwise Terms of Service governing use of our tutoring platform.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/terms-of-service',
  },
};

async function getTermsContent() {
  const filePath = path.join(process.cwd(), 'src/app/(public)/terms-of-service/terms-of-service.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract the title and last updated from the content
  const lines = content.split('\n');
  const titleLine = lines.find(line => line.startsWith('Tutorwise Terms'));
  const lastUpdatedLine = lines.find(line => line.startsWith('Last Updated:'));

  // Remove title and last updated from content (we'll render them in PageHeader)
  const contentWithoutHeader = lines
    .filter(line => !line.startsWith('Tutorwise Terms') && !line.startsWith('Last Updated:'))
    .join('\n')
    .trim();

  return {
    content: contentWithoutHeader,
    lastUpdated: lastUpdatedLine?.replace('Last Updated:', '').trim() || '',
  };
}

export default async function TermsOfServicePage() {
  const { content, lastUpdated } = await getTermsContent();

  return (
    <Container variant="narrow">
      <PageHeader title="Terms of Service" subtitle={`Last Updated: ${lastUpdated}`} />
      <div className={styles.legalText}>
        <MDXRemote source={content} />
      </div>
    </Container>
  );
}
