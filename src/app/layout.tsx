/*
 * Filename: src/app/layout.tsx
 * Purpose: Serves as the root layout, setting up global styles, fonts, and the session provider.
 *
 * Change History:
 * C003 - 2025-07-22 : 23:45 - Refactored to use a dedicated Layout component.
 * C002 - 2025-07-22 : 23:30 - Corrected variable names for font classes.
 * C001 - 2025-07-22 : 23:00 - Replaced AuthProvider with NextAuth.js SessionProvider.
 *
 * Last Modified: 2025-07-22 : 23:45
 * Requirement ID (optional): VIN-M-01
 *
 * Change Summary:
 * This file has been simplified. It is now only responsible for the root `<html>` and `<body>` tags
 * and for wrapping the application in the `SessionProvider`. The visual layout (Header/Footer)
 * has been correctly moved to a new dedicated `Layout` component. The font variable typos have
 * also been fixed.
 *
 * Impact Analysis:
 * This change fixes all outstanding build errors and establishes a clean, maintainable root layout.
 */
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import SessionProvider from '@/app/components/auth/SessionProvider';
import Layout from './components/layout/Layout'; // Import the new Layout component
import "./globals.css";

// The variables are declared with uppercase names
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-secondary' });
const poppins = Poppins({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700'], variable: '--font-primary' });

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
    // The variables must be accessed with the correct uppercase names
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=optional" 
        />
      </head>
      <body>
        <SessionProvider>
          <Layout>{children}</Layout>
        </SessionProvider>
      </body>
    </html>
  );
}