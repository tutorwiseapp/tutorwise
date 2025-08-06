/*
 * Filename: src/app/layout.tsx
<<<<<<< HEAD
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
=======
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
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast'; // This line is already correct.
import Layout from '@/app/components/layout/Layout'; // Import the new Layout component

// The variables are declared with uppercase names
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-secondary' });
const poppins = Poppins({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700'], variable: '--font-primary' });

export const metadata: Metadata = {
  title: "Vinite - The Universal Referral App",
  description: "Create and share Vinite referral links, no sign up required.",
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
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