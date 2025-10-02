# Frontend Deployment Options

This frontend can be deployed to either **Vercel** (primary) or **Railway** (backup).

## Current Setup: Vercel (Active)

**Primary deployment**: Vercel
- Automatic deployments from `main` branch
- Optimized for Next.js with edge caching
- No Docker required

## Backup Option: Railway (Inactive)

Railway configuration is ready but **disabled by default** to prevent deployment conflicts.

### To Activate Railway Frontend:

1. **In Railway Dashboard:**
   - Go to your frontend service settings
   - Under "Build", ensure it's configured to use:
     - Docker Context: `apps/web`
     - Dockerfile Path: `Dockerfile`
   - OR point to `apps/web/railway.json`

2. **Disable Vercel (if switching):**
   - Pause the Vercel project to prevent dual deployments
   - Update DNS/environment variables to point to Railway

3. **Deploy:**
   - Push to main branch, Railway will auto-deploy
   - Or use Railway CLI: `railway up`

### To Keep Railway as Backup Only:

**Current configuration**: Railway frontend service should be **paused** or have **auto-deploy disabled**.

In Railway Dashboard:
- Go to frontend service → Settings → Environment
- Disable "Auto Deploy"
- OR pause the service entirely

This prevents conflicts with Vercel while keeping the configuration ready.

## Environment Variables

Ensure all environment variables from Vercel are also configured in Railway if you switch:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- All other `NEXT_PUBLIC_*` variables
- Backend API URLs

## Files for Railway Deployment

- `apps/web/Dockerfile` - Production-ready Next.js Docker image
- `apps/web/railway.json` - Railway service configuration
- `apps/web/next.config.js` - Has `output: 'standalone'` enabled for Docker

## Switching Back to Vercel

Simply re-enable auto-deploy in Vercel and pause Railway service. No code changes needed.
