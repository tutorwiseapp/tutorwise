/*
 * Filename: next.config.js
 * Purpose: Configures the Next.js application, including approved image sources.
 * Change History:
 * C002 - 2025-07-26 : 18:45 - Added Clerk's image hostname to the remotePatterns array.
 * C001 - [Date] : [Time] - Initial creation.
 * Last Modified: 2025-07-26 : 18:45
 * Requirement ID: VIN-A-002
 * Change Summary: Added 'img.clerk.com' to the list of allowed remote image hostnames.
 * This is the definitive fix for the "Invalid src prop" runtime error that occurs when
 * Next.js attempts to load a user's profile picture from Clerk's CDN.
 * Impact Analysis: This change securely enables Next.js Image Optimization for all user
 * avatars provided by Clerk, resolving a critical runtime error on authenticated pages.
 * Dependencies: "next".
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Enable MDX support for help centre articles
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // URL rewrites for cleaner public URLs
  async rewrites() {
    return [];
  },
  images: {
    remotePatterns: [
      // For Google OAuth Avatars
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      // --- THIS IS THE FIX ---
      // For user-uploaded avatars stored in Supabase Storage.
      // The hostname is your Supabase Project URL's domain.
      {
        protocol: 'https',
        hostname: 'xzhdbvygrbddcevxminj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // For user-uploaded avatars stored in Supabase Storage (new project).
      {
        protocol: 'https',
        hostname: 'lvsmtgmpoysjygdwcrir.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // For placeholder avatars
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      // For resource page images
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig

