#!/bin/bash
set -e

echo "Migrating secrets from .env.local to Google Secret Manager..."
echo "============================================================"

PROJECT_ID="tutorwise-secrets"

# Check if gcloud is configured
if ! gcloud config get-value project &> /dev/null; then
    echo "❌ Google Cloud not configured. Run: gcloud auth login"
    exit 1
fi

gcloud config set project $PROJECT_ID

# Define ALL secrets to migrate from .env.local
declare -A secrets=(
    # Supabase Configuration
    ["next-public-supabase-url"]="NEXT_PUBLIC_SUPABASE_URL"
    ["next-public-supabase-anon-key"]="NEXT_PUBLIC_SUPABASE_ANON_KEY"
    ["supabase-service-role-key"]="SUPABASE_SERVICE_ROLE_KEY"
    ["supabase-jwt-secret"]="SUPABASE_JWT_SECRET"

    # Database Configuration
    ["postgres-prisma-url"]="POSTGRES_PRISMA_URL"
    ["postgres-url-non-pooling"]="POSTGRES_URL_NON_POOLING"
    ["postgres-url"]="POSTGRES_URL"
    ["postgres-user"]="POSTGRES_USER"
    ["postgres-host"]="POSTGRES_HOST"
    ["postgres-password"]="POSTGRES_PASSWORD"
    ["postgres-database"]="POSTGRES_DATABASE"

    # Google Cloud Platform
    ["google-client-id"]="GOOGLE_CLIENT_ID"
    ["google-client-secret"]="GOOGLE_CLIENT_SECRET"
    ["google-ai-api-key"]="GOOGLE_AI_API_KEY"
    ["google-service-account-path"]="GOOGLE_SERVICE_ACCOUNT_PATH"
    ["google-docs-folder-ids"]="GOOGLE_DOCS_FOLDER_IDS"
    ["google-calendar-ids"]="GOOGLE_CALENDAR_IDS"

    # Stripe Payment Configuration
    ["next-public-stripe-publishable-key"]="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    ["stripe-secret-key"]="STRIPE_SECRET_KEY"

    # JIRA Integration
    ["jira-base-url"]="JIRA_BASE_URL"
    ["jira-email"]="JIRA_EMAIL"
    ["jira-api-token"]="JIRA_API_TOKEN"
    ["jira-project-key"]="JIRA_PROJECT_KEY"

    # GitHub Integration
    ["github-token"]="GITHUB_TOKEN"
    ["github-owner"]="GITHUB_OWNER"
    ["github-repo"]="GITHUB_REPO"
    ["github-project-number"]="GITHUB_PROJECT_NUMBER"

    # Figma Integration
    ["figma-access-token"]="FIGMA_ACCESS_TOKEN"
    ["figma-file-keys"]="FIGMA_FILE_KEYS"

    # Railway Backend API
    ["next-public-api-url"]="NEXT_PUBLIC_API_URL"

    # Neo4j Integration
    ["neo4j-uri"]="NEO4J_URI"
    ["neo4j-username"]="NEO4J_USERNAME"
    ["neo4j-password"]="NEO4J_PASSWORD"

    # Redis Integration
    ["redis-url"]="REDIS_URL"
    ["redis-password"]="REDIS_PASSWORD"

    # Railway Token
    ["railway-token"]="RAILWAY_TOKEN"

    # Terraform Cloud
    ["tfc-token"]="TFC_TOKEN"
    ["tfc-workspace-id"]="TFC_WORKSPACE_ID"
)

# Source the .env.local file
if [ -f ".env.local" ]; then
    source .env.local
else
    echo "❌ .env.local file not found"
    exit 1
fi

echo "Creating secrets in Google Secret Manager..."

for secret_name in "${!secrets[@]}"; do
    env_var="${secrets[$secret_name]}"
    secret_value="${!env_var}"

    if [ -n "$secret_value" ]; then
        echo "Creating secret: $secret_name"
        echo "$secret_value" | gcloud secrets create "$secret_name" --data-file=- || \
        echo "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
        echo "✅ $secret_name created/updated"
    else
        echo "⚠️  $env_var not found in environment"
    fi
done

echo ""
echo "✅ Secret migration completed!"
echo ""
echo "Created secrets:"
gcloud secrets list --format="table(name,createTime)"

echo ""
echo "Next steps:"
echo "1. Test secret access: tools/scripts/test-secret-manager.sh"
echo "2. Update application code to use Secret Manager"
echo "3. Remove secrets from .env.local (keep non-sensitive config)"