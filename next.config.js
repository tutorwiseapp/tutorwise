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
  images: {
    remotePatterns: [
      // --- THIS IS THE FIX ---
      // Add the following block to approve images from Clerk's CDN.
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      // Your existing patterns are preserved.
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;