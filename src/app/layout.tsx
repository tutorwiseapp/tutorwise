/*
 * Filename: src/app/layout.tsx
 * Purpose: Serves as the root layout for the entire application, setting up global styles, fonts, and context providers.
 *
 * Change History:
 * C002 - 2025-07-20 : 14:30 - Added link to Material Symbols stylesheet to enable icon font.
 * C001 - 25 July 2024 : 10:00 - Wrapped application with DataProvider.
 *
 * Last Modified: 2025-07-20 : 14:30
 * Requirement ID (optional): VIN-UI-006
 *
 * Change Summary:
 * Added a <link> tag in the <head> to import the 'Material Symbols Outlined' font from Google Fonts.
 * This makes the icon font available globally, fixing the issue where icons were not rendering on the
 * marketing page or any other component.
 *
 * Impact Analysis:
 * This is an application-wide enhancement. It allows any page or component to correctly render
 * Material Symbols by using the 'material-symbols-outlined' className.
 *
 * Dependencies: "next", "@/components/auth/AuthProvider", "@/components/data/DataProvider".
 */

import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import AuthProvider from '@/app/components/auth/AuthProvider';
import "./globals.css";

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
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <head>
        {/* --- THIS IS THE FIX --- */}
        {/* This link imports the icon font, making it available across the entire app. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=optional"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}