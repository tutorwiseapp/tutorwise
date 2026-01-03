#!/bin/bash
# Filename: tools/database/db-connect.sh
# Purpose: Helper script to connect to Supabase database using credentials from .env.local
# Usage:
#   ./tools/database/db-connect.sh                    # Interactive psql session
#   ./tools/database/db-connect.sh -f migration.sql   # Run a migration file
#   ./tools/database/db-connect.sh -c "SELECT ..."    # Run a SQL command

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | grep -E '^(POSTGRES_|NEXT_PUBLIC_SUPABASE_)' | xargs)
fi

# Extract connection details from POSTGRES_URL_NON_POOLING for direct connection
# postgresql://postgres.lvsmtgmpoysjygdwcrir:8goRkJd6cPkPGyIY@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

export PGPASSWORD="${POSTGRES_PASSWORD}"
export PGHOST="aws-1-eu-west-2.pooler.supabase.com"
export PGPORT="5432"  # Use non-pooled port for DDL operations
export PGUSER="postgres.lvsmtgmpoysjygdwcrir"
export PGDATABASE="postgres"

# Run psql with any arguments passed to this script
psql "$@"
