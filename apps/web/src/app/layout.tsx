/*
 * Filename: src/app/layout.tsx
 * Purpose: Serves as the root layout, using a dedicated Providers component for client-side context.
 * Change History:
 * C007 - 2025-08-31 : 19:00 - Replaced direct use of KindeProvider with a dedicated <Providers> Client Component.
 * Last Modified: 2025-08-31 : 19:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This is the definitive fix for the createContext build error. The <KindeProvider> has been moved into its own providers.tsx Client Component. This layout now uses the <Providers> component to wrap the application, establishing a clean and robust boundary between server and client components.
 */
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers'; // --- THIS IS THE FIX ---
import Layout from './components/layout/Layout';
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-primary'
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-secondary'
});

// Enhanced SEO Metadata (Critical for search engines and social media - Updated 2025-12-21)
export const metadata: Metadata = {
  title: 'Find Expert Tutors & Educational Services | Tutorwise',
  description: 'Browse verified tutors, workshops, and study packages. Connect with expert educators for one-to-one tutoring, group sessions, and personalized learning experiences.',
  keywords: [
    'tutoring',
    'tutors',
    'online tutoring',
    'education',
    'learning',
    'private tutors',
    'GCSE tutors',
    'A-Level tutors',
    'university tutors',
    'study packages',
    'workshops',
    'educational services',
  ],
  openGraph: {
    title: 'Find Expert Tutors & Educational Services | Tutorwise',
    description: 'Browse verified tutors, workshops, and study packages. Connect with expert educators for personalized learning.',
    url: 'https://tutorwise.com',
    siteName: 'Tutorwise',
    type: 'website',
    locale: 'en_GB',
    images: [{
      url: '/og-image-home.png',
      width: 1200,
      height: 630,
      alt: 'Tutorwise - Find Expert Tutors and Educational Services',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find Expert Tutors | Tutorwise',
    description: 'Browse verified tutors, workshops, and study packages',
    images: ['/og-image-home.png'],
    creator: '@tutorwise',
  },
  alternates: {
    canonical: 'https://tutorwise.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body>
        {/* --- THIS IS THE FIX --- */}
        {/* The Providers component creates the correct boundary */}
        <Providers>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
            }}
          />
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}