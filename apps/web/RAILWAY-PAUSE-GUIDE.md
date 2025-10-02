# How to Pause Railway Frontend Service

This guide shows how to pause the Railway frontend service to prevent failure states while keeping it as a backup deployment option.

## Step-by-Step Instructions

### Option 1: Pause the Service (Recommended)

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Select your project (tutorwise)

2. **Find the Frontend Service**
   - You should see multiple services (backend + frontend)
   - Click on the **frontend service** (not the backend/API)

3. **Pause the Service**
   - Click on **Settings** tab (gear icon)
   - Scroll down to find **"Service Settings"** or **"Danger Zone"**
   - Click **"Pause Service"** or **"Stop Service"**
   - Confirm the action

4. **Verify**
   - Service status should change from "Failed" to "Paused" or "Stopped"
   - No more failed deployment notifications
   - Service definition remains intact for future use

### Option 2: Disable Auto-Deploy (Alternative)

If you want to keep the service active but stop automatic deployments:

1. **Go to Frontend Service → Settings**

2. **Find "Deployments" or "Build" section**

3. **Toggle off "Auto Deploy"** or **"Deploy on Push"**

4. **Save Changes**

This keeps the last deployment running but won't trigger new builds from GitHub.

### Option 3: Configure Service to Use New Dockerfile

If you actually want the Railway frontend to work alongside Vercel:

1. **Go to Frontend Service → Settings**

2. **Under "Build" section:**
   - **Root Directory**: Leave empty or set to project root
   - **Docker Context**: `apps/web`
   - **Dockerfile Path**: `Dockerfile`

3. **Under "Deploy" section:**
   - **Start Command**: `node server.js`

4. **Add Environment Variables**
   - Copy all `NEXT_PUBLIC_*` variables from Vercel
   - Add any other required env vars

5. **Trigger a new deployment**
   - Go to Deployments tab
   - Click "Deploy"

**Warning**: This will create a second live frontend. Make sure you update DNS/URLs appropriately.

## When to Un-Pause

Un-pause the Railway frontend when:
- Vercel experiences downtime
- You want to migrate away from Vercel
- You need to test Railway deployment
- You're implementing multi-region redundancy

## Quick Reference

| Action | Location in Dashboard |
|--------|----------------------|
| Pause Service | Settings → Pause Service |
| Disable Auto-Deploy | Settings → Deployments → Auto Deploy (toggle off) |
| Change Docker Context | Settings → Build → Docker Context |
| Trigger Manual Deploy | Deployments → Deploy button |

## Resuming Service Later

To activate Railway frontend when needed:

1. Settings → **"Resume Service"** or **"Start Service"**
2. Verify environment variables are configured
3. Trigger a deployment
4. Update your DNS/frontend URL references if switching from Vercel

---

**Current Recommended State**: Service **Paused** ✅
- No deployment conflicts with Vercel
- No failed deployment notifications
- Ready to activate as backup when needed
