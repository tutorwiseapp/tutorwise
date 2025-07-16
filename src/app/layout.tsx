import type { Metadata } from 'next';
// Corrected: Import 'Material_Symbols_Outlined' directly from next/font/google
import { Inter, Poppins } from 'next/font/google';
import AuthProvider from '@/app/components/auth/AuthProvider';
import "./globals.css";

// --- Font Configuration ---
const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap', 
  variable: '--font-secondary' 
});

const poppins = Poppins({ 
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-primary'
});

// --- THIS IS THE FIX ---
// The Material Symbols font is now loaded via a direct link in the <head>
// as it's not directly available through next/font/google in the same way.
// This is a temporary workaround until a better solution is found or if
// Material Symbols is added to next/font/google.
// const materialSymbols = Material_Symbols_Outlined({
//   weight: ['400'],
//   style: ['normal'],
//   subsets: ['latin'],
//   display: 'optional',
//   variable: '--font-material-symbols'
// });

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
    // The font variables are now combined in the html tag's className
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      
      {/* The direct <link> tag in the <head> is no longer needed. */}
      <head />

      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}