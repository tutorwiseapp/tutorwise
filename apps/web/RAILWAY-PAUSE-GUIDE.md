# How to Pause Railway Frontend Service

This guide shows how to pause the Railway frontend service to prevent failure states while keeping it as a backup deployment option.

## Step-by-Step Instructions

### Option 1: Delete the Frontend Service (Recommended)

Since Railway's UI may not show a "Pause" option, the cleanest approach is to delete the service. Don't worry - we can recreate it anytime from the Dockerfile we created.

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Select your project (tutorwise)

2. **Find the Frontend Service**
   - You should see multiple services (backend + frontend)
   - Click on the **frontend service** (not the backend/API)

3. **Delete the Service**
   - Click on **Settings** tab (⚙️ gear icon)
   - Scroll to bottom **"Danger Zone"**
   - Click **"Remove Service from Project"** or **"Delete Service"**
   - Type the service name to confirm
   - Click **Confirm**

4. **Verify**
   - Frontend service removed from project
   - No more failed deployment notifications
   - Backend service still running ✅
   - Can recreate anytime using the Dockerfile in apps/web/

**Don't worry**: All the code (Dockerfile, railway.json) is saved in your repo. You can recreate this service in 2 minutes when needed.

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

## How to Recreate the Service Later

To recreate the Railway frontend service when needed:

1. **In Railway Dashboard → Your Project**
2. Click **"+ New Service"**
3. Select **"GitHub Repo"**
4. Choose your tutorwise repository
5. **Configure the service:**
   - **Root Directory**: Leave empty
   - **Build**: Use Dockerfile
   - **Docker Context**: `apps/web`
   - **Dockerfile Path**: `Dockerfile`
6. **Add all environment variables** (copy from Vercel)
7. **Deploy**

The service will use the Dockerfile we created in `apps/web/`.

## When to Recreate/Use Railway Frontend

Recreate the Railway frontend when:
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

---

**Current Recommended State**: Frontend service **Deleted** from Railway ✅
- No deployment conflicts with Vercel
- No failed deployment notifications
- Ready to activate as backup when needed
