/*
 * Filename: src/app/layout.tsx
 * Purpose: Serves as the root layout, setting up global styles, fonts, and the Clerk auth provider.
 * Change History:
 * C002 - 2025-07-27 : 23:45 - Added Toaster for app-wide notifications.
 * C001 - 2025-07-26 : 10:00 - Initial setup for Clerk conversion.
 * Last Modified: 2025-07-27 : 23:45
 * Requirement ID: VIN-M-01
 * Change Summary: Added the <Toaster /> component from `react-hot-toast`. This allows any page
 * or component in the application to trigger global notifications, such as the error
 * messages on the payments page.
 * Impact Analysis: This is an additive change that provides a global notification system.
 * Dependencies: "next", "@clerk/nextjs", "react-hot-toast", "./globals.css", "./components/layout/Layout".
 */
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast'; // This line is already correct.
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
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          <Layout>{children}</Layout>
        </body>
      </html>
    </ClerkProvider>
  );
}