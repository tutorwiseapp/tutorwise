# Update Software Packages Tasks

# Packages

Package	Before	After
Stripe SDK 18.5.0 → 20.2.0
vercel/speed-insights	1.2.0	1.3.1
vercel/blob	1.1.1	2.0.1
supabase/supabase-js	2.75.0	2.93.1
tailwindcss/postcss	4.1.13	4.1.18
tanstack/react-query	5.90.7	5.90.20
radix-ui/react-label	2.1.7	2.1.8
testing-library/react	16.3.0	16.3.2
next/mdx	16.1.0	16.1.5
tldraw	2.x	4.3.0
ably/chat	1.1.0	1.1.1
ably	2.14.0	2.17.0
sentry/nextjs	10.23.0	10.37.0
babel/preset-*	7.27.x	7.28.x
eslint/eslintrc	3.3.1	3.3.3
playwright/test	1.56.0	1.58.0
storybook/*	8.6.x	10.2.x
chromatic-com/storybook	3.2.7	5.0.0

React 18.3.1 to 19.2.4
Next.js 14.2.33 to Next.js 16.x (latest)


# Packages Cannot Be Updated

elliptic (6)	Low	Storybook polyfills (dev-only)	- Requires Storybook upstream fix

Unfortunately, the elliptic vulnerability cannot be fixed right now. Here's the situation:
CVE-2025-14505 (Critical) - No Fix Available
The vulnerability chain is:

@storybook/nextjs@10.2.1
  └── node-polyfill-webpack-plugin@2.0.1
        └── crypto-browserify@3.12.1
              └── elliptic@6.6.1 ← vulnerable (ALL versions affected)
Key facts:

The elliptic package maintainers have not released a fix - even 6.6.1 (latest) is vulnerable
The Storybook issue #33522 tracking this is open with no solution yet
The elliptic package is considered "inactive" with no releases in 12+ months

Accept the risk (recommended) - dev-only, low practical impact
Suppress in CI - configure npm audit to ignore this specific vulnerability
Wait - monitor the Storybook issue for upstream fix



