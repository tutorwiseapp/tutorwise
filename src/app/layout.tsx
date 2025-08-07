/*
 * Filename: src/app/layout.tsx
 * Purpose: Serves as the root layout, setting up global styles, fonts, and the Clerk auth provider.
 * Change History:
 * C003 - 2025-07-28 : 12:00 - Definitive fix to resolve merge conflicts.
 * C002 - 2025-07-27 : 23:45 - Added Toaster for app-wide notifications.
 * C001 - 2025-07-26 : 10:00 - Initial setup for Clerk conversion.
 * Last Modified: 2025-07-28 : 12:00
 * Requirement ID: VIN-M-01
 * Change Summary: This is the definitive fix for the merge conflict. The file has been manually
 * repaired to remove all conflict markers and remnants of the old NextAuth.js system. It now
 * correctly and exclusively uses the <ClerkProvider> for authentication.
 * Impact Analysis: This change resolves a critical build-blocking error and restores the
 * application's root layout to a stable, functional state.
 * Dependencies: "next", "@clerk/nextjs", "./globals.css", "./components/layout/Layout".
 */
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
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

export const metadata: Metadata = {
  title: "Vinite - The Simplest Referral Tool",
  description: "Create and share traceable referral links, no sign up required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
        <head>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=optional"
          />
        </head>
        <body>
          <Layout>{children}</Layout>
        </body>
      </html>
    </ClerkProvider>
  );
}