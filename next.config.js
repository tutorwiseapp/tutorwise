/** @type {import('next').NextConfig} */
const nextConfig = {
  // ADD THIS 'images' CONFIGURATION BLOCK
  images: {
    remotePatterns: [
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
      // You can add other trusted image hostnames here in the future
    ],
  },
};

module.exports = nextConfig;