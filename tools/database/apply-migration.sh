#!/bin/bash
# Filename: tools/database/apply-migration.sh
# Purpose: Apply a database migration using credentials from .env.local
# Usage: ./tools/database/apply-migration.sh 157_add_referrals_updated_at.sql

if [ -z "$1" ]; then
    echo "Usage: $0 <migration_file>"
    echo "Example: $0 157_add_referrals_updated_at.sql"
    exit 1
fi

MIGRATION_FILE="$1"

# If just filename provided, look in migrations directory
if [ ! -f "$MIGRATION_FILE" ]; then
    MIGRATION_FILE="tools/database/migrations/$1"
fi

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Applying migration: $MIGRATION_FILE"

# Use db-connect.sh to apply the migration
./tools/database/db-connect.sh -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Migration applied successfully!"
else
    echo "✗ Migration failed!"
    exit 1
fi
