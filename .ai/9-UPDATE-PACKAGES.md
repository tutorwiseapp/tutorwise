# Update Software Packages Tasks

Last updated: 2026-03-11

## Completed Upgrades

Package	Before	After
React	18.3.1	19.2.4
Next.js	14.2.33	16.1.6
Stripe SDK	18.5.0	20.2.0
tldraw	2.x	4.3.0
storybook/*	8.6.x	10.2.x
chromatic-com/storybook	3.2.7	5.0.0
jest	29.x	30.1.3
@jest/globals	29.x	30.1.2
babel-jest	29.x	30.2.0
jest-environment-jsdom	29.x	30.1.2
@types/jest	29.x	30.0.0
vercel/speed-insights	1.2.0	1.3.1
vercel/blob	1.1.1	2.0.1
supabase/supabase-js	2.75.0	2.93.1
tailwindcss/postcss	4.1.13	4.1.18
tanstack/react-query	5.90.7	5.90.20
radix-ui/react-label	2.1.7	2.1.8
testing-library/react	16.3.0	16.3.2
next/mdx	16.1.0	16.1.5
ably/chat	1.1.0	1.1.1
ably	2.14.0	2.17.0
sentry/nextjs	10.23.0	10.37.0
babel/preset-*	7.27.x	7.28.x
eslint/eslintrc	3.3.1	3.3.3
playwright/test	1.56.0	1.58.0

## Current Stack Versions (as of 2026-03-11)

### Core Framework
- Next.js: 16.1.6
- React / React DOM: 19.2.4
- TypeScript: 5.x
- Tailwind CSS: 4.x

### Conductor & Operations (formerly CAS/iPOM)
- @langchain/langgraph: 1.2.0 — LangGraph StateGraph for TeamRuntime and PlatformWorkflowRuntime
- @langchain/langgraph-checkpoint-postgres: 1.0.1 — PostgresSaver for LangGraph checkpointing
- @langchain/core: 1.1.29 — LangGraph core abstractions
- @dagrejs/dagre: 2.0.4 — graph layout for Conductor canvas
- reactflow: 11.11.4 — Conductor process studio canvas

### Caching & Rate Limiting
- ioredis: 5.9.2 — Redis client for PlatformUserContext caching
- @upstash/redis: 1.35.6 — Upstash Redis for serverless caching
- @upstash/ratelimit: 2.0.7 — Rate limiting

### AI Providers
- @google/generative-ai: 0.24.1 — Gemini (embeddings + generation)
- @google/genai: 1.22.0 — Google GenAI SDK (root workspace)
- @anthropic-ai/sdk: 0.71.2 — Claude
- openai: 4.104.0 (web) / 6.25.0 (root) — OpenAI
- @modelcontextprotocol/sdk: 1.27.1 — MCP protocol

### Database & Auth
- @supabase/supabase-js: 2.93.1
- @supabase/ssr: 0.7.0
- @supabase/auth-helpers-nextjs: 0.10.0
- pg: 8.16.3

### Payments
- stripe: 20.2.0
- @stripe/stripe-js: 3.5.0
- @stripe/react-stripe-js: 2.9.0

### Real-time
- ably: 2.17.0
- @ably/chat: 1.1.1

### Testing
- jest: 30.1.3
- @playwright/test: 1.58.0
- storybook: 10.2.1
- @testing-library/react: 16.3.2
- msw: 2.11.3

### Monitoring
- @sentry/nextjs: 10.37.0


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
