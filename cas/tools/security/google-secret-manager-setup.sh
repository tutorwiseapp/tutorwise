#!/bin/bash
set -e

echo "Setting up Google Cloud Secret Manager..."
echo "======================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not installed"
    echo "Install with: brew install google-cloud-sdk"
    exit 1
fi

# Set project variables
PROJECT_ID="tutorwise-secrets"
SERVICE_ACCOUNT_NAME="tutorwise-secret-accessor"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Setting up GCP project: $PROJECT_ID"

# Create project (if not exists)
gcloud projects create $PROJECT_ID --name="TutorWise Secrets" || echo "Project might already exist"

# Set current project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

echo "Enabling IAM API..."
gcloud services enable iam.googleapis.com

# Create service account
echo "Creating service account: $SERVICE_ACCOUNT_NAME"
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="TutorWise Secret Accessor" \
    --description="Service account for accessing secrets in TutorWise application" || echo "Service account might already exist"

# Grant Secret Manager access
echo "Granting Secret Manager Secret Accessor role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

# Create and download service account key
echo "Creating service account key..."
gcloud iam service-accounts keys create ./google-service-account-key.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

echo ""
echo "✅ Google Cloud Secret Manager setup completed!"
echo ""
echo "Next steps:"
echo "1. Add google-service-account-key.json to your deployment platform as GOOGLE_SERVICE_ACCOUNT_KEY"
echo "2. Set GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID in environment"
echo "3. Run: tools/scripts/migrate-secrets-to-gcp.sh"
echo ""
echo "Security reminder: Add google-service-account-key.json to .gitignore"