import type { Preview } from '@storybook/react'
import { initialize, mswLoader } from 'msw-storybook-addon'
import '../src/app/globals.css' // Import global styles including Tailwind

// Initialize MSW
initialize()

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Configure actions addon
    actions: { argTypesRegex: '^on[A-Z].*' },
    // Configure backgrounds
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a202c' },
        { name: 'gray', value: '#f7fafc' },
      ],
    },
    // Configure viewport addon for responsive testing
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
    // Layout configuration
    layout: 'centered',
  },
  // Enable MSW loader
  loaders: [mswLoader],
};

export default preview;
