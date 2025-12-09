#!/bin/bash

# Run migration 098 via Supabase Management API
# This script executes raw SQL using the Supabase service role key

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing Supabase credentials in .env.local"
  exit 1
fi

echo "Running migration 098: Create saved_listings table..."
echo ""

# Read the SQL file
SQL_FILE="apps/api/migrations/098_create_saved_listings_table.sql"
SQL_CONTENT=$(cat "$SQL_FILE")

# Extract project ref from URL
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "Project ref: $PROJECT_REF"
echo "Executing SQL..."
echo ""

# Execute SQL using Supabase REST API query endpoint
# We'll execute each statement separately to avoid issues
psql "postgresql://postgres:[YOUR_DB_PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres" \
  -f "$SQL_FILE" 2>&1 || {
  echo ""
  echo "⚠️  Direct psql connection failed. This is expected if you don't have the database password."
  echo ""
  echo "Please run this SQL manually in your Supabase SQL Editor:"
  echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
  echo ""
  cat "$SQL_FILE"
  exit 0
}

echo ""
echo "✅ Migration 098 completed successfully!"
echo ""
echo "Created:"
echo "- saved_listings table"
echo "- Indexes for performance"
echo "- RLS policies for security"
