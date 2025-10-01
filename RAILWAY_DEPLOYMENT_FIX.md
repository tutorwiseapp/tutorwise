# Railway Deployment Fix

## Problem
Railway is looking for Dockerfile but can't find it because of conflicting root directory settings.

## Solution Options

### Option 1: Use Root Directory Setting (Recommended)
1. In Railway Dashboard:
   - Go to your service settings
   - Set **Root Directory** to: `apps/api`
   - Set **Dockerfile Path** to: `Dockerfile` (not `apps/api/Dockerfile`)
   - Save and redeploy

### Option 2: Use Project Root
1. In Railway Dashboard:
   - **Clear/Remove** the Root Directory setting (leave it empty)
   - Set **Dockerfile Path** to: `apps/api/Dockerfile`
   - Save and redeploy

## Current Configuration
- railway.json location: `apps/api/railway.json`
- Dockerfile location: `apps/api/Dockerfile`
- dockerfilePath in railway.json: `Dockerfile`

## Why This Happens
When Railway sets Root Directory to `apps/api`, it changes its working directory to that folder.
Then it looks for the Dockerfile path relative to that new root. So:
- Root Directory: `apps/api`
- Dockerfile Path: `Dockerfile` 
- Actual path: `apps/api/Dockerfile` ✓

## Test
After changing settings, trigger a manual deploy in Railway dashboard.
