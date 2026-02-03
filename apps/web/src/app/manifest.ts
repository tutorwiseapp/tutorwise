import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tutorwise',
    short_name: 'Tutorwise',
    description: 'Connect with verified, credible tutors for personalized learning',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#006C67',
    icons: [
      {
        src: '/image/Tutorwise-app-logo.png',
        sizes: '1000x1000',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
