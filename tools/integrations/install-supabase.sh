#!/bin/bash
set -e

echo "Installing Supabase CLI..."

# Check if Supabase CLI is already installed
if command -v supabase &> /dev/null; then
    echo "Supabase CLI already installed: $(supabase --version)"
    exit 0
fi

# Install Supabase CLI
echo "Installing Supabase CLI via npm..."
npm install -g supabase

# Verify installation
if command -v supabase &> /dev/null; then
    echo "Supabase CLI installed successfully: $(supabase --version)"
    echo "Use 'supabase login' to authenticate"
    echo "Use 'supabase link --project-ref YOUR_PROJECT_REF' to link project"
else
    echo "Supabase CLI installation failed"
    exit 1
fi