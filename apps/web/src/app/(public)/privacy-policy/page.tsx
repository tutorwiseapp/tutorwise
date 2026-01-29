/**
 * Filename: apps/web/src/app/(public)/privacy-policy/page.tsx
 * Purpose: Privacy Policy page rendering markdown content
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
  title: 'Privacy Policy | Tutorwise',
  description: 'Read the Tutorwise Privacy Policy explaining how we collect, use, and protect your personal data.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://tutorwise.com/privacy-policy',
  },
};

async function getPrivacyContent() {
  const filePath = path.join(process.cwd(), 'src/app/(public)/privacy-policy/privacy-policy.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract the title and last updated from the content
  const lines = content.split('\n');
  const lastUpdatedLine = lines.find(line => line.startsWith('Last Updated:'));

  // Remove title and last updated from content (we'll render them in PageHeader)
  const contentWithoutHeader = lines
    .filter(line => !line.startsWith('Tutorwise Privacy') && !line.startsWith('Last Updated:'))
    .join('\n')
    .trim();

  return {
    content: contentWithoutHeader,
    lastUpdated: lastUpdatedLine?.replace('Last Updated:', '').trim() || '',
  };
}

export default async function PrivacyPolicyPage() {
  const { content, lastUpdated } = await getPrivacyContent();

  return (
    <Container variant="narrow">
      <PageHeader title="Privacy Policy" subtitle={`Last Updated: ${lastUpdated}`} />
      <div className={styles.legalText}>
        <MDXRemote source={content} />
      </div>
    </Container>
  );
}
