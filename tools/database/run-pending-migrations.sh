#!/bin/bash

# ===================================================================
# Migration Runner Script for v4.6 + v5.0
# Purpose: Runs pending migrations 061-064 to fix profile_graph error
# Created: 2025-11-13
# Updated: 2025-11-13 - Updated paths to apps/api/migrations
# ===================================================================

set -e  # Exit on error

echo "========================================"
echo "Running Pending Migrations (v4.6 + v5.0)"
echo "========================================"
echo ""

# Check if POSTGRES_URL_NON_POOLING is set
if [ -z "$POSTGRES_URL_NON_POOLING" ]; then
    echo "ERROR: POSTGRES_URL_NON_POOLING environment variable is not set"
    echo "Please set it in your .env.local file"
    exit 1
fi

# Base directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
MIGRATIONS_DIR="$PROJECT_ROOT/apps/api/migrations"

echo "Migration directory: $MIGRATIONS_DIR"
echo "Database: $POSTGRES_URL_NON_POOLING"
echo ""

# Function to run a migration
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")

    echo "-----------------------------------"
    echo "Running: $migration_name"
    echo "-----------------------------------"

    if [ ! -f "$migration_file" ]; then
        echo "ERROR: Migration file not found: $migration_file"
        exit 1
    fi

    # Execute the migration using psql
    if psql "$POSTGRES_URL_NON_POOLING" -f "$migration_file"; then
        echo "✅ SUCCESS: $migration_name completed"
        echo ""
    else
        echo "❌ FAILED: $migration_name"
        echo "Migration failed. Please check the error above."
        exit 1
    fi
}

# Run migrations in order
echo "Step 1/4: Creating profile_graph table (v4.6 core)"
run_migration "$MIGRATIONS_DIR/061_add_profile_graph_v4_6.sql"

echo "Step 2/4: Migrating connections to profile_graph"
run_migration "$MIGRATIONS_DIR/062_migrate_connections_to_profile_graph.sql"

echo "Step 3/4: Adding Student role and bookings link (v5.0)"
run_migration "$MIGRATIONS_DIR/063_add_student_role_and_bookings_link.sql"

echo "Step 4/4: Creating integration links table (v5.0)"
run_migration "$MIGRATIONS_DIR/064_create_integration_links_table.sql"

echo ""
echo "========================================"
echo "✅ All migrations completed successfully!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Refresh your browser to see the My Students page working"
echo "2. The profile_graph table error should now be resolved"
echo ""
