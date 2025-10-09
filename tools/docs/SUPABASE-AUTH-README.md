# Supabase Authentication & Configuration Guide

## Overview

This guide explains Supabase's authentication and API key system, and how to properly configure access for TutorWise's database, authentication, and storage features.

## API Key Types

Supabase uses different API keys for different security contexts and use cases.

### 1. Anon (Public) Key

**What it is:**
- Public-facing API key safe to use in client-side code
- Protected by Row Level Security (RLS) policies
- Only allows operations permitted by RLS rules
- No expiry date

**When to use:**
- ✅ Frontend applications (Next.js, React, Vue, etc.)
- ✅ Mobile apps (React Native, Flutter, Swift, Kotlin)
- ✅ Client-side authentication
- ✅ Public data access with RLS protection
- ✅ User-scoped operations

**Where to find:**
- URL: https://app.supabase.com/project/[PROJECT_ID]/settings/api
- Path: Project Settings → API → Project API keys → `anon` `public`

**Security:**
- ✅ Safe to expose in frontend code
- ✅ Protected by Row Level Security
- ✅ Can be committed to git in public repos (if RLS is properly configured)
- ⚠️ All access is governed by RLS policies

**How to use:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# In client code
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

### 2. Service Role (Secret) Key

**What it is:**
- Server-side only, secret API key
- Full database access, **bypasses Row Level Security**
- Complete admin privileges
- No expiry date

**When to use:**
- ✅ Server-side API routes
- ✅ Backend services (FastAPI, Express, etc.)
- ✅ Database migrations
- ✅ Admin operations
- ✅ Batch processing
- ✅ Scheduled tasks/cron jobs

**When NOT to use:**
- ❌ **NEVER** use in client-side code
- ❌ **NEVER** expose in frontend
- ❌ **NEVER** commit to public repositories
- ❌ **NEVER** use in mobile apps

**Where to find:**
- URL: https://app.supabase.com/project/[PROJECT_ID]/settings/api
- Path: Project Settings → API → Project API keys → `service_role` `secret`

**Security:**
- ❌ Must be kept SECRET at all times
- ✅ Only use server-side
- ✅ Store in `.env.local` (git-ignored)
- ✅ Use environment variables in production
- ⚠️ Bypasses ALL Row Level Security policies

**How to use:**
```bash
# .env.local (NEVER commit this!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# In server code ONLY (API routes, backend)
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### 3. Custom Access Tokens (Advanced)

**What it is:**
- User-specific JWT tokens generated after authentication
- Scoped to individual user permissions
- Short-lived (1 hour default)
- Automatically managed by Supabase Auth

**When to use:**
- ✅ Automatically used after user login
- ✅ User-specific data access
- ✅ Handled by Supabase Auth client
- ✅ No manual management needed

**How it works:**
```javascript
// User logs in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Supabase automatically uses the user's access token
// for all subsequent requests
const { data: userData } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user.id)  // RLS ensures user can only access their data
```

## Required Environment Variables

### For Frontend (Next.js, React, Vue)

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: For custom configurations
NEXT_PUBLIC_SUPABASE_STORAGE_URL=https://xxxxxxxxxxxxx.supabase.co/storage/v1
```

### For Backend (API Routes, FastAPI, Express)

```bash
# .env.local (git-ignored!)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Also include anon key for client initialization
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For Database Direct Connection

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Connection pooling (for serverless/edge functions)
DATABASE_POOLING_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true
```

## Finding Your Credentials

### Method 1: From Supabase Dashboard

1. **Project URL:**
   - Go to: https://app.supabase.com/project/[PROJECT_ID]/settings/api
   - Copy "Project URL"
   - Example: `https://abcdefghijklmnop.supabase.co`

2. **API Keys:**
   - Same page: Settings → API
   - Copy `anon` `public` for frontend
   - Copy `service_role` `secret` for backend (keep secret!)

3. **Database Password:**
   - Go to: Settings → Database
   - Use existing password or reset it
   - Copy connection string

### Method 2: From Project Settings

```bash
# All credentials are in Project Settings → API
URL:              https://[PROJECT_REF].supabase.co
Anon key:         eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.[ANON_KEY]
Service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.[SERVICE_KEY]
```

### Method 3: Using Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref [PROJECT_REF]

# Get project status (shows URL)
supabase status

# Get database connection string
supabase db remote --url
```

## Common Issues & Solutions

### Issue 1: "Invalid API Key" or "Invalid JWT"

**Symptoms:**
```bash
Error: Invalid API key
Error: JWT expired
```

**Causes:**
1. Using wrong API key (anon vs service_role)
2. API key copied incorrectly (truncated or extra spaces)
3. Project was paused/deleted
4. Using old key after project reset

**Solutions:**
1. **Verify the key:**
   ```bash
   # Check your .env.local
   cat .env.local | grep SUPABASE

   # Compare with dashboard
   # Settings → API → Project API keys
   ```

2. **Ensure using correct key for context:**
   - Frontend: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Backend: Use `SUPABASE_SERVICE_ROLE_KEY`

3. **Copy fresh keys:**
   - Go to Settings → API
   - Click "Reveal" on the key
   - Copy the entire key (they're long!)
   - Update `.env.local`

### Issue 2: "Row Level Security policy violation"

**Symptoms:**
```bash
Error: new row violates row-level security policy
Error: permission denied for table [table_name]
```

**Causes:**
1. RLS is enabled but no policies exist
2. Policies don't cover the operation (INSERT, UPDATE, DELETE)
3. Using anon key without proper user authentication
4. Policy conditions don't match the data

**Solutions:**
1. **Check RLS status:**
   - Go to: Database → Tables
   - Find your table
   - Check if RLS is enabled

2. **Create or update RLS policies:**
   ```sql
   -- Enable RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Allow authenticated users to read their own profile
   CREATE POLICY "Users can view own profile"
   ON profiles
   FOR SELECT
   USING (auth.uid() = id);

   -- Allow authenticated users to update their own profile
   CREATE POLICY "Users can update own profile"
   ON profiles
   FOR UPDATE
   USING (auth.uid() = id);
   ```

3. **Use service_role key for admin operations:**
   ```javascript
   // For admin operations, use service role key
   const supabaseAdmin = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY  // Bypasses RLS
   )
   ```

4. **Ensure user is authenticated:**
   ```javascript
   // Check if user is logged in
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) {
     // Redirect to login
   }
   ```

### Issue 3: "Connection refused" or "Network error"

**Symptoms:**
```bash
Error: connect ECONNREFUSED
Error: Network request failed
```

**Causes:**
1. Wrong Supabase URL
2. Project is paused
3. Network/firewall issues
4. Using pooler URL in wrong context

**Solutions:**
1. **Verify URL is correct:**
   ```bash
   # Should look like:
   https://[PROJECT_REF].supabase.co

   # Not like:
   https://supabase.com  # ❌ Wrong
   http://[PROJECT_REF].supabase.co  # ❌ Should be https
   ```

2. **Check project status:**
   - Go to Supabase dashboard
   - Ensure project is not paused
   - Free tier projects pause after inactivity

3. **Use correct connection string:**
   ```bash
   # For serverless (Vercel, Netlify)
   DATABASE_POOLING_URL=postgresql://...?pgbouncer=true

   # For long-lived connections (local dev)
   DATABASE_URL=postgresql://...
   ```

### Issue 4: "Too many connections" in Production

**Symptoms:**
```bash
Error: sorry, too many clients already
Error: remaining connection slots are reserved
```

**Causes:**
1. Using direct connection in serverless environment
2. Not using connection pooling
3. Connection leak (not closing connections)

**Solutions:**
1. **Use connection pooling URL:**
   ```bash
   # Use port 6543 with pgbouncer
   DATABASE_POOLING_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true
   ```

2. **Use Supabase client (recommended):**
   ```javascript
   // Handles connection pooling automatically
   import { createClient } from '@supabase/supabase-js'

   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_ANON_KEY
   )
   ```

3. **Close connections properly:**
   ```javascript
   // If using direct PostgreSQL connection
   const client = new Client({ connectionString })
   await client.connect()
   try {
     // Your queries
   } finally {
     await client.end()  // Always close
   }
   ```

## Setup Guide

### Step-by-Step: Local Development Setup

1. **Create Supabase Project** (if not exists):
   - Go to https://app.supabase.com
   - Click "New Project"
   - Choose organization
   - Set project name and database password
   - Select region (closest to users)
   - Wait for project setup (~2 minutes)

2. **Get Your Credentials:**
   - Go to: Settings → API
   - Copy:
     - **Project URL**
     - **anon public key**
     - **service_role secret key** (keep secret!)

3. **Add to Environment Variables:**
   ```bash
   # Edit .env.local
   cat >> .env.local << EOF
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   EOF
   ```

4. **Install Supabase Client:**
   ```bash
   npm install @supabase/supabase-js
   # or
   pnpm add @supabase/supabase-js
   ```

5. **Initialize Supabase Client:**
   ```javascript
   // lib/supabase.js
   import { createClient } from '@supabase/supabase-js'

   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   )

   // For admin operations (server-side only!)
   export const supabaseAdmin = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY,
     {
       auth: {
         autoRefreshToken: false,
         persistSession: false
       }
     }
   )
   ```

6. **Test Connection:**
   ```javascript
   // Test in API route or server component
   const { data, error } = await supabase
     .from('profiles')
     .select('*')
     .limit(1)

   if (error) {
     console.error('Connection failed:', error)
   } else {
     console.log('Connected successfully!')
   }
   ```

### Step-by-Step: Database Setup

1. **Create Tables:**
   - Go to: Database → Tables → New Table
   - Or use SQL Editor:
   ```sql
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users PRIMARY KEY,
     email TEXT,
     full_name TEXT,
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Enable Row Level Security:**
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

3. **Create RLS Policies:**
   ```sql
   -- Users can view their own profile
   CREATE POLICY "Users can view own profile"
   ON profiles FOR SELECT
   USING (auth.uid() = id);

   -- Users can update their own profile
   CREATE POLICY "Users can update own profile"
   ON profiles FOR UPDATE
   USING (auth.uid() = id);

   -- Users can insert their own profile
   CREATE POLICY "Users can insert own profile"
   ON profiles FOR INSERT
   WITH CHECK (auth.uid() = id);
   ```

4. **Test RLS Policies:**
   ```javascript
   // Login as user
   const { data: { user } } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password'
   })

   // Try to access data (should work for own data only)
   const { data } = await supabase
     .from('profiles')
     .select('*')
     .eq('id', user.id)
   ```

### Step-by-Step: Authentication Setup

1. **Configure Auth Providers:**
   - Go to: Authentication → Providers
   - Enable desired providers:
     - ✅ Email (default)
     - ✅ Google OAuth
     - ✅ GitHub OAuth
     - ✅ Magic Link
     - etc.

2. **Configure Email Templates:**
   - Go to: Authentication → Email Templates
   - Customize:
     - Confirmation email
     - Password reset
     - Magic link

3. **Set up OAuth (if using):**
   ```bash
   # For Google OAuth
   # 1. Create OAuth app in Google Cloud Console
   # 2. Get Client ID and Secret
   # 3. Add to Supabase:
   #    Authentication → Providers → Google
   #    - Client ID: [YOUR_CLIENT_ID]
   #    - Client Secret: [YOUR_CLIENT_SECRET]
   # 4. Add redirect URL: https://[PROJECT_REF].supabase.co/auth/v1/callback
   ```

4. **Implement Authentication:**
   ```javascript
   // Sign up
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'password',
     options: {
       data: {
         full_name: 'John Doe'
       }
     }
   })

   // Sign in
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password'
   })

   // Sign out
   await supabase.auth.signOut()

   // Get current user
   const { data: { user } } = await supabase.auth.getUser()
   ```

### Step-by-Step: Production Deployment

1. **Add Environment Variables to Vercel/Railway:**

   **Vercel:**
   - Go to: Project → Settings → Environment Variables
   - Add for each environment (Production, Preview, Development):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
   SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]  # Production only!
   ```

   **Railway:**
   - Go to: Project → Variables
   - Add:
   ```
   SUPABASE_URL=https://[PROJECT_REF].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]
   ```

2. **Configure Allowed Origins (CORS):**
   - Go to: Settings → API → URL Configuration
   - Add your domains:
     - `https://yourapp.vercel.app`
     - `https://www.yourdomain.com`
     - `http://localhost:3000` (for local dev)

3. **Set Up Database Backups:**
   - Go to: Settings → Database → Backups
   - Enable automatic backups
   - Set retention period

4. **Monitor Usage:**
   - Go to: Project Dashboard
   - Check:
     - Database size
     - Auth users
     - Storage usage
     - API requests

## Security Best Practices

### ✅ Do's

- ✅ Always use RLS on tables with sensitive data
- ✅ Use anon key for frontend
- ✅ Use service_role key ONLY server-side
- ✅ Store service_role key in `.env.local` (git-ignored)
- ✅ Test RLS policies thoroughly
- ✅ Use strong database passwords
- ✅ Enable MFA for Supabase account
- ✅ Monitor auth logs regularly
- ✅ Set up database backups
- ✅ Use connection pooling in production
- ✅ Implement rate limiting
- ✅ Validate user input

### ❌ Don'ts

- ❌ **NEVER** expose service_role key in frontend
- ❌ **NEVER** commit service_role key to git
- ❌ Don't disable RLS on production tables
- ❌ Don't use service_role key for user operations
- ❌ Don't store passwords in plain text
- ❌ Don't use weak RLS policies
- ❌ Don't allow unauthenticated access to sensitive data
- ❌ Don't forget to close database connections
- ❌ Don't use direct connection in serverless
- ❌ Don't share API keys between environments

## Quick Reference

### API Key Usage Matrix

| Context | Key to Use | Environment Variable | Can Expose? |
|---------|-----------|---------------------|-------------|
| **Frontend (Browser)** | Anon/Public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes (with RLS) |
| **API Routes (Server)** | Service Role | `SUPABASE_SERVICE_ROLE_KEY` | ❌ No (secret!) |
| **Mobile Apps** | Anon/Public | `SUPABASE_ANON_KEY` | ✅ Yes (with RLS) |
| **Backend Services** | Service Role | `SUPABASE_SERVICE_ROLE_KEY` | ❌ No (secret!) |
| **CLI/Scripts** | Service Role | `SUPABASE_SERVICE_ROLE_KEY` | ❌ No (secret!) |
| **Migrations** | Service Role | `SUPABASE_SERVICE_ROLE_KEY` | ❌ No (secret!) |
| **CI/CD** | Service Role | GitHub Secret | ❌ No (secret!) |

### Connection String Formats

```bash
# Direct connection (local development, long-lived connections)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Pooled connection (serverless, edge functions, production)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true

# With SSL (recommended for production)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

### Useful Supabase CLI Commands

```bash
# Authentication
supabase login                  # Login to Supabase
supabase logout                 # Logout

# Project Management
supabase projects list          # List all projects
supabase link --project-ref [REF]  # Link to project
supabase status                 # Show project status

# Database
supabase db remote --url        # Get connection string
supabase db pull                # Pull schema from remote
supabase db push                # Push schema to remote
supabase db reset               # Reset local database
supabase db diff                # Show schema differences

# Migrations
supabase migration new [name]   # Create new migration
supabase migration up           # Run migrations
supabase migration list         # List migrations

# Functions
supabase functions list         # List edge functions
supabase functions deploy [name]  # Deploy function
supabase functions serve        # Serve functions locally

# Storage
supabase storage ls             # List buckets
supabase storage cp [file] [bucket]  # Upload file
```

## Troubleshooting Checklist

When encountering Supabase issues:

- [ ] Verify URL is correct: `https://[PROJECT_REF].supabase.co`
- [ ] Check API key is complete (very long JWT token)
- [ ] Ensure using correct key: anon for frontend, service_role for backend
- [ ] Verify RLS policies allow the operation
- [ ] Check user is authenticated (for user-scoped operations)
- [ ] Confirm project is not paused (free tier)
- [ ] Test with service_role key to isolate RLS issues
- [ ] Check database connection limit
- [ ] Verify CORS origins are configured
- [ ] Review Supabase logs: Dashboard → Logs
- [ ] Test locally with `supabase start`

## Related Documentation

- [Railway Auth Guide](./RAILWAY-AUTH-README.md)
- [Vercel Auth Guide](./VERCEL-AUTH-README.md)
- [Stripe Auth Guide](./STRIPE-AUTH-README.md)
- [Supabase Official Docs](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Summary

**The Golden Rules:**

1. **Use Anon Key for Client-Side** - Safe to expose, protected by RLS
2. **Use Service Role Key for Server-Side ONLY** - Full admin access, keep secret
3. **Always Enable RLS on Production Tables** - Security first
4. **Use Connection Pooling in Production** - Avoid "too many connections"
5. **Never Commit Service Role Key to Git** - Use `.env.local` (git-ignored)

**Quick Setup:**
```bash
# 1. Get credentials from: https://app.supabase.com/project/[ID]/settings/api
# 2. Add to .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]  # Keep secret!

# 3. Initialize client
npm install @supabase/supabase-js

# 4. Test connection
# See "Initialize Supabase Client" section above
```
