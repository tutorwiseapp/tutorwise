# Quick Fix for Blog 404 Error

## Problem

Getting 404 error when visiting blog article pages like `/blog/building-successful-tutoring-business`.

## Root Cause

The database migrations haven't been run yet, so the `blog_articles` table is empty.

## Solution

You need to run the database migrations to populate the blog articles table with seed data.

### Step 1: Run Migration 174 (Blog Articles Table)

```bash
cd /Users/michaelquan/projects/tutorwise

# Option A: If you have a psql connection string
psql YOUR_DATABASE_URL < tools/database/migrations/174_create_blog_articles_table.sql

# Option B: If using Supabase dashboard
# Copy the contents of tools/database/migrations/174_create_blog_articles_table.sql
# Paste into Supabase SQL Editor and run
```

This migration will:
- Create the `blog_articles` table
- Insert 5 seed articles with these slugs:
  - `building-successful-tutoring-business`
  - `how-to-find-perfect-tutor`
  - `uk-tutoring-market-2026`
  - `how-to-price-tutoring-services`
  - `growing-tutoring-agency`

### Step 2: Verify Articles in Database

```sql
SELECT slug, title, status FROM blog_articles;
```

You should see 5 articles with status='published'.

### Step 3: Test the Blog

Visit: `http://localhost:3000/blog`

You should now see articles loaded from the database.

## Alternative: Temporary Fallback (Optional)

If you can't run migrations right now but want to test, you can temporarily add fallback data to the article page. However, **running the migration is the proper solution**.

---

**Next Steps:**

After fixing the 404:
1. Continue with manual setup tasks in `MANUAL_SEO_SETUP_TASKS.md`
2. Run migration 175 for SEO analytics tables
3. Set up Google Analytics and Search Console
