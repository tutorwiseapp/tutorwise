//
// Filename: src/app/layout.tsx
// Purpose: Serves as the root layout for the entire application, setting up global styles, fonts, and context providers.
// Change History:
// C001 - 25 July 2024 : 10:00 - Wrapped application with DataProvider.
// Last Modified: 25 July 2024.
// Requirement ID (optional): VIN-001.
// Change Summary: Added the `DataProvider` to make the centralized user list available to all child components, fixing a state management bug.
// Impact Analysis: This change is necessary to fix the "Agent Not Found" bug. It enables pages to consume the `useData` hook. It has no negative impact on pages that do not use the hook.
// Dependencies: "next", "@/components/auth/AuthProvider", "@/components/data/DataProvider"
// Props (if applicable): "children: React.ReactNode"
// TODO (if applicable): None.
//

import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import AuthProvider from '@/app/components/auth/AuthProvider';
import { DataProvider } from '@/app/components/data/DataProvider';
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
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=optional" 
        />
      </head>
      <body>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}