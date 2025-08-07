/*
 * Filename: src/app/layout.tsx
 * Purpose: Serves as the root layout, setting up global styles, fonts, and the Clerk auth provider.
 * Change History:
 * C004 - 2025-08-07 : 18:00 - Added global Toaster provider for notifications.
 * C003 - 2025-07-28 : 12:00 - Definitive fix to resolve merge conflicts.
 * C002 - 2025-07-27 : 23:45 - Added Toaster for app-wide notifications.
 * Last Modified: 2025-08-07 : 18:00
 * Requirement ID: VIN-M-01
 * Change Summary: Added the `<Toaster />` component from `react-hot-toast`. This enables the notification system used in pages like "Payments", fulfilling an intended but incomplete feature and improving user feedback according to the "Engaging & Responsive" principle.
 * Impact Analysis: This is a global, non-breaking enhancement. It makes toast notifications functional across the entire application.
 * Dependencies: "next", "@clerk/nextjs", "react-hot-toast", "./globals.css", "./components/layout/Layout".
 */
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast'; // --- FIX ---
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
          {/* --- FIX: Add the Toaster component here --- */}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
            }}
          />
          <Layout>{children}</Layout>
        </body>
      </html>
    </ClerkProvider>
  );
}