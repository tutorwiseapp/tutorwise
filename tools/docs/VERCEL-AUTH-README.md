# Vercel Authentication & Deployment Guide

## Overview

This guide explains Vercel's authentication system and how to properly configure tokens for CLI access and deployment in TutorWise.

## Token Types

### 1. User Access Token (Personal Account)

**What it is:**
- Personal authentication token for your Vercel account
- Full access to all your personal projects
- No expiry date
- Used for CLI operations and local development

**When to use:**
- ✅ Local development with Vercel CLI
- ✅ Personal projects
- ✅ Testing deployments
- ✅ Interactive CLI operations

**Where to create:**
- URL: https://vercel.com/account/tokens
- Path: Account Settings → Tokens → Create Token

**How to create:**
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Give it a descriptive name (e.g., "Local Development" or "CLI Access")
4. Select scope: **Full Account** (for all projects) or specific projects
5. Click "Create Token"
6. Copy the token immediately (you won't see it again)

**How to use:**
```bash
# Add to .env.local
VERCEL_TOKEN=your-user-token-here

# Or login interactively
vercel login
```

### 2. Project Access Token (Team/Project Specific)

**What it is:**
- Token scoped to a specific project or team
- Limited access to designated resources
- Used for CI/CD and automated deployments
- Can be scoped to specific environments (production, preview, development)

**When to use:**
- ✅ GitHub Actions / GitLab CI
- ✅ Automated deployment pipelines
- ✅ Team collaborations
- ✅ Production deployments with restricted access

**Where to create:**
- URL: https://vercel.com/[team]/[project]/settings/tokens
- Path: Project Settings → Tokens → Create Token

**How to create:**
1. Navigate to your project on Vercel
2. Go to Settings → Tokens
3. Click "Create Token"
4. Configure:
   - **Name**: Descriptive (e.g., "GitHub Actions Deploy")
   - **Scope**: Select environments (Production, Preview, Development)
   - **Expiration**: Set expiry date or never expire
5. Click "Create"
6. Copy the token

**How to use:**
```bash
# CI/CD environment variable
VERCEL_TOKEN=your-project-token-here

# Or use vercel CLI
vercel --token=$VERCEL_TOKEN
```

### 3. Deploy Hooks (Webhook-based Deployment)

**What it is:**
- URL-based deployment trigger
- No authentication token needed
- Triggers deployment via HTTP POST request
- Can be scoped to specific branches

**When to use:**
- ✅ Webhook integrations
- ✅ External automation tools
- ✅ CMS rebuild triggers
- ✅ Scheduled deployments via cron

**Where to create:**
- URL: https://vercel.com/[team]/[project]/settings/git
- Path: Project Settings → Git → Deploy Hooks

**How to create:**
1. Go to Project Settings → Git
2. Scroll to "Deploy Hooks"
3. Click "Create Hook"
4. Configure:
   - **Name**: Hook description
   - **Branch**: Which branch to deploy (main, develop, etc.)
5. Copy the generated URL

**How to use:**
```bash
# Trigger deployment via curl
curl -X POST https://api.vercel.com/v1/integrations/deploy/[PROJECT_ID]/[HOOK_ID]

# Or via JavaScript
fetch('https://api.vercel.com/v1/integrations/deploy/[PROJECT_ID]/[HOOK_ID]', {
  method: 'POST'
})
```

## Required Environment Variables

### For Local Development

```bash
# .env.local
VERCEL_TOKEN=your-user-access-token
VERCEL_ORG_ID=your-organization-id          # Optional: for team projects
VERCEL_PROJECT_ID=your-project-id           # Optional: for specific project
```

### For CI/CD (GitHub Actions)

```bash
# GitHub Secrets
VERCEL_TOKEN=your-project-access-token
VERCEL_ORG_ID=org_xxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxx
```

### For Application (Runtime)

```bash
# .env.local (auto-available in Vercel)
NEXT_PUBLIC_VERCEL_URL=$VERCEL_URL          # Auto-set by Vercel
VERCEL_ENV=$VERCEL_ENV                      # production | preview | development
VERCEL_GIT_COMMIT_SHA=$VERCEL_GIT_COMMIT_SHA
```

## Finding Your Project IDs

### Method 1: From Vercel Dashboard
1. Open your project on Vercel
2. Go to Settings → General
3. Copy:
   - **Project ID**: Under "Project ID"
   - **Team ID/Org ID**: In the URL or Settings → General

### Method 2: Using Vercel CLI
```bash
# Link project (interactive)
vercel link

# This creates .vercel/project.json with:
{
  "orgId": "team_xxxxx",
  "projectId": "prj_xxxxx"
}

# View project info
vercel inspect
```

### Method 3: From .vercel Directory
```bash
# After linking, check the generated file
cat .vercel/project.json
```

## Common Issues & Solutions

### Issue 1: "Forbidden - Insufficient Permissions"

**Symptoms:**
```bash
Error: Forbidden - You do not have permission to access this resource
```

**Causes:**
1. Using a token with insufficient scope
2. Token doesn't have access to the project/team
3. Token expired or was revoked

**Solutions:**
1. **Check token scope:**
   - Go to https://vercel.com/account/tokens
   - Verify token has access to your project
   - For team projects, ensure token has team access

2. **Create new token with correct scope:**
   - Delete old token
   - Create new token with "Full Account" or specific project access
   - Update `.env.local` or GitHub Secrets

3. **For team projects:**
   ```bash
   # Ensure you're in the right team context
   vercel switch [team-name]

   # Then link the project
   vercel link
   ```

### Issue 2: "Project Not Found"

**Symptoms:**
```bash
Error: Project not found
```

**Causes:**
1. Not linked to a Vercel project
2. Wrong `VERCEL_PROJECT_ID` or `VERCEL_ORG_ID`
3. Project was deleted or moved

**Solutions:**
1. **Link the project:**
   ```bash
   # Interactive linking
   vercel link

   # Or specify manually
   vercel link --project=[project-name]
   ```

2. **Verify IDs:**
   ```bash
   # Check project.json
   cat .vercel/project.json

   # Compare with dashboard
   # Settings → General → Project ID
   ```

3. **Re-link if needed:**
   ```bash
   # Remove existing link
   rm -rf .vercel

   # Link again
   vercel link
   ```

### Issue 3: "Invalid Token" in CI/CD

**Symptoms:**
```bash
Error: Invalid token
```

**Causes:**
1. Token not set in GitHub Secrets
2. Typo in secret name
3. Token was revoked
4. Using wrong token type for automation

**Solutions:**
1. **Verify GitHub Secret:**
   - Go to Repo → Settings → Secrets → Actions
   - Check `VERCEL_TOKEN` exists and is correct

2. **Use Project Token for CI/CD:**
   ```yaml
   # .github/workflows/deploy.yml
   - name: Deploy to Vercel
     env:
       VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
       VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
       VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
     run: vercel deploy --prod
   ```

3. **Create fresh Project Token:**
   - Project Settings → Tokens → Create Token
   - Scope to required environments
   - Update GitHub Secrets

### Issue 4: "Build Failed" or Environment Variables Missing

**Symptoms:**
```bash
Error: Missing required environment variable
```

**Causes:**
1. Environment variables not set in Vercel
2. Variables set for wrong environment
3. Variables not available at build time

**Solutions:**
1. **Set environment variables in Vercel:**
   - Project Settings → Environment Variables
   - Add variable for each environment:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

2. **For build-time variables (NEXT_PUBLIC_*):**
   ```bash
   # Must be prefixed with NEXT_PUBLIC_ to be available in browser
   NEXT_PUBLIC_API_URL=https://api.example.com
   NEXT_PUBLIC_STRIPE_KEY=pk_test_xxxxx
   ```

3. **Redeploy after adding variables:**
   ```bash
   vercel --prod
   # Or trigger redeploy from dashboard
   ```

## Setup Guide

### Step-by-Step: Local Development Setup

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   # or
   pnpm add -g vercel
   ```

2. **Create Access Token:**
   - Visit: https://vercel.com/account/tokens
   - Click "Create Token"
   - Name: "Local Development"
   - Scope: Full Account
   - Copy token

3. **Add Token to Environment:**
   ```bash
   # Edit .env.local
   echo "VERCEL_TOKEN=your-token-here" >> .env.local
   ```

4. **Login and Link Project:**
   ```bash
   # Option 1: Use token
   vercel login --token=$VERCEL_TOKEN

   # Option 2: Interactive login
   vercel login

   # Link to project
   vercel link
   ```

5. **Test Deployment:**
   ```bash
   # Deploy to preview
   vercel

   # Deploy to production
   vercel --prod
   ```

### Step-by-Step: CI/CD Setup (GitHub Actions)

1. **Get Project IDs:**
   ```bash
   # Link project locally first
   vercel link

   # View IDs
   cat .vercel/project.json
   ```

2. **Create Project Token:**
   - Go to Project Settings → Tokens
   - Click "Create Token"
   - Name: "GitHub Actions"
   - Scope: Production + Preview
   - Copy token

3. **Add GitHub Secrets:**
   - Go to: Repo → Settings → Secrets → Actions
   - Add secrets:
     - `VERCEL_TOKEN`: Your project token
     - `VERCEL_ORG_ID`: From .vercel/project.json
     - `VERCEL_PROJECT_ID`: From .vercel/project.json

4. **Create Workflow:**
   ```yaml
   # .github/workflows/deploy-vercel.yml
   name: Deploy to Vercel

   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3

         - name: Install Vercel CLI
           run: npm install -g vercel

         - name: Pull Vercel Environment
           run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
           env:
             VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
             VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

         - name: Build Project
           run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

         - name: Deploy to Vercel
           run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
   ```

5. **Test Workflow:**
   - Push to main branch
   - Check Actions tab for deployment status
   - Verify deployment on Vercel dashboard

### Step-by-Step: Environment Variables Setup

1. **Navigate to Project Settings:**
   - Open project on Vercel
   - Go to Settings → Environment Variables

2. **Add Variables by Environment:**

   **Production:**
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=your-production-key
   STRIPE_SECRET_KEY=sk_live_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

   **Preview (for PR deployments):**
   ```
   SUPABASE_URL=https://staging.supabase.co
   SUPABASE_ANON_KEY=your-staging-key
   STRIPE_SECRET_KEY=sk_test_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   ```

   **Development:**
   ```
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=your-local-key
   STRIPE_SECRET_KEY=sk_test_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   ```

3. **Redeploy to Apply:**
   ```bash
   vercel --prod
   ```

## Deployment Scripts

### Create Vercel Deploy Script

```bash
#!/bin/bash
# tools/scripts/vercel-deploy.sh

set -e

echo "🔷 TutorWise Vercel Deployment"
echo "=============================="

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Load token from .env.local
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    if grep -q "VERCEL_TOKEN" "$PROJECT_ROOT/.env.local"; then
        export $(grep "^VERCEL_TOKEN=" "$PROJECT_ROOT/.env.local" | xargs)
        echo "🔑 Vercel token loaded from .env.local"
    fi
fi

# Verify authentication
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel."
    echo "   1. Add VERCEL_TOKEN to .env.local, or"
    echo "   2. Run 'vercel login'"
    exit 1
fi

echo "👤 User: $(vercel whoami)"

# Deploy
echo "🚀 Deploying to Vercel..."
cd "$PROJECT_ROOT/apps/web"

# Choose environment
if [ "$1" == "prod" ]; then
    vercel --prod
else
    vercel
fi

echo "✅ Deployment complete!"
```

## Security Best Practices

### ✅ Do's

- ✅ Use User Tokens for local development
- ✅ Use Project Tokens for CI/CD
- ✅ Store tokens in `.env.local` (git-ignored)
- ✅ Use GitHub Secrets for automation
- ✅ Scope tokens to minimum required access
- ✅ Set token expiration dates
- ✅ Rotate tokens periodically
- ✅ Use different tokens for different environments
- ✅ Revoke unused tokens immediately
- ✅ Use Deploy Hooks for simple triggers

### ❌ Don'ts

- ❌ Never commit tokens to git
- ❌ Don't share tokens between team members
- ❌ Don't use production tokens for testing
- ❌ Don't hardcode tokens in scripts
- ❌ Don't use same token across all projects
- ❌ Don't expose tokens in logs
- ❌ Don't store tokens in public repositories
- ❌ Don't use personal tokens in team CI/CD

## Quick Reference

### Useful Commands

```bash
# Authentication
vercel login                    # Interactive login
vercel logout                   # Logout
vercel whoami                   # Check current user

# Project Management
vercel link                     # Link to project
vercel ls                       # List projects
vercel inspect                  # Show project details
vercel switch [team]            # Switch team context

# Deployment
vercel                          # Deploy to preview
vercel --prod                   # Deploy to production
vercel --token=$TOKEN           # Deploy with token
vercel rm [deployment-url]      # Remove deployment

# Environment
vercel env ls                   # List environment variables
vercel env add [name]           # Add environment variable
vercel env rm [name]            # Remove environment variable
vercel env pull                 # Download env to .env.local

# Domains
vercel domains ls               # List domains
vercel domains add [domain]     # Add domain
vercel alias [url] [domain]     # Set domain alias

# Logs
vercel logs [url]               # View deployment logs
vercel logs --follow            # Follow logs in real-time
```

### Environment Variable Precedence

1. **Build-time** (available during `next build`):
   - All environment variables from Vercel dashboard
   - `NEXT_PUBLIC_*` variables

2. **Runtime** (available in API routes/server):
   - All non-public environment variables
   - Vercel system variables (`VERCEL_*`)

3. **Client-side** (available in browser):
   - Only `NEXT_PUBLIC_*` prefixed variables
   - Vercel's automatic variables: `NEXT_PUBLIC_VERCEL_URL`

### Vercel System Variables (Auto-injected)

```bash
VERCEL=1                        # Always "1" when on Vercel
VERCEL_ENV                      # production | preview | development
VERCEL_URL                      # Deployment URL
VERCEL_REGION                   # Deployment region
VERCEL_GIT_PROVIDER             # github | gitlab | bitbucket
VERCEL_GIT_REPO_SLUG            # repository-name
VERCEL_GIT_REPO_OWNER           # owner-name
VERCEL_GIT_REPO_ID              # Repository ID
VERCEL_GIT_COMMIT_REF           # Branch or tag name
VERCEL_GIT_COMMIT_SHA           # Commit hash
VERCEL_GIT_COMMIT_MESSAGE       # Commit message
VERCEL_GIT_COMMIT_AUTHOR_LOGIN  # Author username
VERCEL_GIT_COMMIT_AUTHOR_NAME   # Author name
```

## Troubleshooting Checklist

When encountering Vercel issues:

- [ ] Verify CLI is installed: `vercel --version`
- [ ] Check authentication: `vercel whoami`
- [ ] Verify project is linked: `cat .vercel/project.json`
- [ ] Check token exists in `.env.local` or GitHub Secrets
- [ ] Ensure token has correct scope/permissions
- [ ] Verify environment variables are set in Vercel dashboard
- [ ] Check build logs for specific errors: `vercel logs [url]`
- [ ] Test locally first: `vercel dev`
- [ ] Verify domain configuration: `vercel domains ls`
- [ ] Check team context: `vercel switch`

## Related Documentation

- [Vercel Deploy Script](./vercel-deploy.sh)
- [Railway Auth Guide](./RAILWAY-AUTH-README.md)
- [Supabase Auth Guide](./SUPABASE-AUTH-README.md)
- [Stripe Auth Guide](./STRIPE-AUTH-README.md)
- [Vercel Official Docs](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

## Summary

**The Golden Rules:**
1. **Use User Access Tokens for local development** - Full account access for CLI operations
2. **Use Project Tokens for CI/CD** - Scoped access for automated deployments
3. **Use Deploy Hooks for simple triggers** - No token needed for webhook-based deployments
4. **Always set environment variables per environment** - Production, Preview, Development
5. **Prefix client-side variables with NEXT_PUBLIC_** - Makes them available in browser

**Quick Setup:**
```bash
# 1. Get token: https://vercel.com/account/tokens
# 2. Add to .env.local
echo "VERCEL_TOKEN=your-token" >> .env.local

# 3. Login and link
vercel login --token=$VERCEL_TOKEN
vercel link

# 4. Deploy
vercel --prod
```
