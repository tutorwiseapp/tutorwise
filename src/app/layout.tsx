/*
 * Filename: src/app/layout.tsx
 * Purpose: Serves as the root layout, setting up global styles, fonts, and the Kinde auth provider.
 * Change History:
 * C005 - 2025-08-31 : 15:00 - Definitive fix for blank page error by adding KindeProvider.
 * C004 - 2025-08-07 : 18:00 - Added global Toaster provider for notifications.
 * C003 - 2025-07-28 : 12:00 - Definitive fix to resolve merge conflicts.
 * C002 - 2025-07-27 : 23:45 - Added Toaster for app-wide notifications.
 * Last Modified: 2025-08-31 : 15:00
 * Requirement ID: VIN-AUTH-MIG-01
 * Change Summary: This is the definitive fix for the blank page error after migrating to Kinde. The entire application is now correctly wrapped with the `<KindeProvider>`, which is essential for initializing the Kinde SDK and managing authentication state across all components.
 * Impact Analysis: This change fixes a critical, application-wide failure and restores all page rendering.
 * Dependencies: "next", "@kinde-oss/kinde-auth-nextjs", "react-hot-toast", "./globals.css", "./components/layout/Layout".
 */
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { KindeProvider } from '@kinde-oss/kinde-auth-nextjs';
import { Toaster } from 'react-hot-toast';
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
    <KindeProvider>
      <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
        <head>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=optional"
          />
        </head>
        <body>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
            }}
          />
          <Layout>{children}</Layout>
        </body>
      </html>
    </KindeProvider>
  );
}