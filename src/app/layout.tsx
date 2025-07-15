import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import AuthProvider from '@/app/components/auth/AuthProvider'; // Import the new provider
import "./globals.css";

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-secondary' });
const poppins = Poppins({ 
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-primary'
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
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=optional" />
      </head>
      <body>
        {/* Wrap the entire application in the AuthProvider */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}