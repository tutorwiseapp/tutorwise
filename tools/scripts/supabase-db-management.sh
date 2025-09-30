#!/bin/bash
set -e

echo "TutorWise Database Management"
echo "============================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Run tools/integrations/install-supabase.sh first"
    exit 1
fi

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "Project: $(pwd)"
echo "Supabase CLI: $(supabase --version)"

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "Not logged in to Supabase. Run 'supabase login' first"
    exit 1
fi

echo "User authenticated with Supabase"

# Check if project is linked
if ! supabase status &> /dev/null; then
    echo "No Supabase project linked. Available options:"
    echo "   1. Link existing project: supabase link --project-ref [PROJECT_REF]"
    echo "   2. Initialize new project: supabase init"
    supabase projects list
    exit 1
fi

echo ""
echo "Current status:"
supabase status

echo ""
echo "Available database operations:"
echo "  supabase db start    - Start local database"
echo "  supabase db stop     - Stop local database"
echo "  supabase db reset    - Reset local database"
echo "  supabase db push     - Push migrations to remote"
echo "  supabase db pull     - Pull migrations from remote"
echo "  supabase gen types   - Generate TypeScript types"