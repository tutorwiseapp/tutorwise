# Railway Authentication Guide

## Overview

This guide explains Railway's authentication system and how to properly configure tokens for CLI access in TutorWise.

## Problem Statement

Railway has two types of tokens, and using the wrong type will cause `Unauthorized` errors when running CLI commands like `railway whoami`, `railway link`, or `railway up`.

## Token Types

### 1. Account Token (Required for CLI)

**What it is:**
- A token with full account-level access
- Required for all Railway CLI commands
- No expiry date
- Not tied to any specific project

**When to use:**
- ✅ Running Railway CLI commands (`railway whoami`, `railway link`, `railway up`, etc.)
- ✅ Local development
- ✅ Script automation that needs to interact with multiple projects
- ✅ When you see "Unauthorized" errors with the CLI

**Where to create:**
- URL: https://railway.app/account/tokens
- Path: Account Settings → Tokens → Create Token

**How to create:**
1. Go to https://railway.app/account/tokens
2. Click "Create Token"
3. Give it a descriptive name (e.g., "CLI Access" or "Local Development")
4. **IMPORTANT: Do NOT select a project** (leave it account-wide)
5. Click "Create"
6. Copy the token immediately (you won't see it again)

**How to use:**
```bash
# Add to .env.local
RAILWAY_API_TOKEN=your-account-token-here

# The railway-deploy.sh script will automatically load it
npm run deploy:railway
```

### 2. Project Token (For CI/CD Only)

**What it is:**
- A token scoped to a specific project
- Limited to deployment operations only
- Cannot run most CLI commands
- Designed for CI/CD pipelines

**When to use:**
- ✅ GitHub Actions workflows
- ✅ GitLab CI/CD pipelines
- ✅ Other automated deployment systems
- ✅ When project is already linked in the environment

**When NOT to use:**
- ❌ Local development
- ❌ Railway CLI commands
- ❌ Interactive operations
- ❌ Any script that needs to run `railway whoami`, `railway link`, or `railway status`

**Where to create:**
- URL: https://railway.app/project/[PROJECT_ID]/settings/tokens
- Path: Project Settings → Tokens → Create Token

**Limitations:**
```bash
# These commands FAIL with Project Tokens:
railway whoami          # ❌ Unauthorized
railway link            # ❌ Unauthorized
railway status          # ❌ Unauthorized (unless already linked)

# These commands work (when project is linked):
railway up              # ✅ Works in CI/CD
railway deploy          # ✅ Works in CI/CD
```

## Common Issues & Solutions

### Issue 1: "Unauthorized" Error

**Symptoms:**
```bash
$ railway whoami
Error: Unauthorized. Please login with `railway login`
```

**Cause:**
You're either:
1. Using a Project Token instead of an Account Token
2. Using an expired/invalid token
3. Not logged in at all

**Solution:**
1. Check which token you're using in `.env.local`:
   ```bash
   grep RAILWAY_API_TOKEN .env.local
   ```

2. Create a new Account Token:
   - Go to https://railway.app/account/tokens
   - Create token (without selecting a project)
   - Update `.env.local`:
     ```bash
     RAILWAY_API_TOKEN=your-new-account-token
     ```

3. Test it:
   ```bash
   source .env.local
   railway whoami
   ```

### Issue 2: Token Works in CI/CD but Not Locally

**Cause:**
You're using a Project Token, which works in CI/CD (where the project is already linked) but not in local CLI operations.

**Solution:**
- Keep Project Token for CI/CD (in GitHub Secrets, etc.)
- Create separate Account Token for local development
- Add Account Token to `.env.local` (git-ignored)

### Issue 3: "Project not linked" Error

**Symptoms:**
```bash
$ railway status
Error: Project not linked. Run 'railway link' to link a project.
```

**Cause:**
Your local environment isn't linked to a Railway project.

**Solution:**
```bash
# Option 1: Link existing project
railway link [PROJECT_ID]

# Option 2: View available projects and select
railway list
railway link

# Option 3: Create new project
railway init
```

## Setup Guide

### Step-by-Step: Local Development Setup

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   # or
   brew install railway
   ```

2. **Create Account Token**:
   - Visit: https://railway.app/account/tokens
   - Click "Create Token"
   - Name: "Local Development" or "CLI Access"
   - **Do NOT select a project**
   - Click "Create"
   - Copy the token

3. **Add Token to Environment**:
   ```bash
   # Edit .env.local
   echo "RAILWAY_API_TOKEN=your-account-token-here" >> .env.local
   ```

4. **Verify Authentication**:
   ```bash
   # Load environment
   source .env.local

   # Test authentication
   railway whoami
   # Should show your Railway username
   ```

5. **Link Project** (if needed):
   ```bash
   # List available projects
   railway list

   # Link to your project
   railway link [PROJECT_ID]
   ```

6. **Test Deployment**:
   ```bash
   npm run deploy:railway
   # or
   bash tools/scripts/railway-deploy.sh
   ```

### Step-by-Step: CI/CD Setup

1. **Create Project Token**:
   - Go to your project: https://railway.app/project/[PROJECT_ID]/settings/tokens
   - Click "Create Token"
   - Name: "GitHub Actions" or "CI/CD"
   - Click "Create"
   - Copy the token

2. **Add to CI/CD Secrets**:

   **GitHub Actions:**
   - Go to: Repository → Settings → Secrets → Actions
   - Add new secret: `RAILWAY_TOKEN`
   - Paste the Project Token

   **GitLab CI:**
   - Go to: Project → Settings → CI/CD → Variables
   - Add variable: `RAILWAY_TOKEN`
   - Paste the Project Token

3. **Use in Workflow**:
   ```yaml
   # .github/workflows/deploy.yml
   - name: Deploy to Railway
     env:
       RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
     run: railway up
   ```

## Token Security Best Practices

### ✅ Do's

- ✅ Use Account Tokens for local development
- ✅ Use Project Tokens for CI/CD
- ✅ Store tokens in `.env.local` (git-ignored)
- ✅ Use CI/CD secrets for automation
- ✅ Create descriptive token names
- ✅ Rotate tokens periodically
- ✅ Revoke tokens you're not using

### ❌ Don'ts

- ❌ Never commit tokens to git
- ❌ Don't use Project Tokens for CLI commands
- ❌ Don't share tokens between team members
- ❌ Don't hardcode tokens in scripts
- ❌ Don't use the same token for everything
- ❌ Don't forget to revoke old tokens

## Quick Reference

### Token Comparison Table

| Feature | Account Token | Project Token |
|---------|--------------|---------------|
| **URL to Create** | [railway.app/account/tokens](https://railway.app/account/tokens) | [railway.app/project/*/settings/tokens](https://railway.app/project) |
| **Scope** | Entire account | Single project |
| **Expiry** | Never | Never |
| **CLI Commands** | ✅ All commands | ❌ Limited |
| **Local Dev** | ✅ Recommended | ❌ Won't work |
| **CI/CD** | ✅ Works | ✅ Recommended |
| **`railway whoami`** | ✅ Works | ❌ Unauthorized |
| **`railway link`** | ✅ Works | ❌ Unauthorized |
| **`railway up`** | ✅ Works | ✅ Works (if linked) |
| **`railway status`** | ✅ Works | ⚠️ Works (if linked) |

### Environment Variables

```bash
# .env.local (for local development)
RAILWAY_API_TOKEN=your-account-token-here

# CI/CD (GitHub Actions, GitLab CI, etc.)
RAILWAY_TOKEN=your-project-token-here
```

### Useful Commands

```bash
# Check authentication
railway whoami

# List projects
railway list

# Link to project
railway link [PROJECT_ID]

# Check project status
railway status

# Deploy
railway up

# View logs
railway logs

# Open in browser
railway open

# Logout (clears local auth)
railway logout
```

## Troubleshooting Checklist

When you encounter authentication issues:

- [ ] Verify you're using an **Account Token** (not Project Token) in `.env.local`
- [ ] Check token is properly set: `echo $RAILWAY_API_TOKEN`
- [ ] Test authentication: `railway whoami`
- [ ] Ensure project is linked: `railway status`
- [ ] Verify Railway CLI is installed: `railway --version`
- [ ] Check `.env.local` exists and is loaded: `source .env.local`
- [ ] Try creating a fresh Account Token
- [ ] If all fails, use interactive login: `railway login`

## Related Documentation

- [Railway Deploy Script](./railway-deploy.sh)
- [CAS Startup Utility](./STARTUP-UTILITY-README.md)
- [Railway Official Docs](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)

## Summary

**The Golden Rule:**
> **Always use Account Tokens for CLI operations. Project Tokens are ONLY for CI/CD pipelines.**

When creating a token for local development:
1. Go to **https://railway.app/account/tokens** (not project tokens)
2. Click "Create Token"
3. **DO NOT select a project** ← This is the key!
4. Add to `.env.local` as `RAILWAY_API_TOKEN`
5. Run `source .env.local` and test with `railway whoami`

This simple rule will prevent 99% of Railway authentication issues.
