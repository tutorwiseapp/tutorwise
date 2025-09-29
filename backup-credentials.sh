#!/bin/bash
# Secure Credential Backup Script for Tutorwise Project
# Usage: ./backup-credentials.sh

BACKUP_DIR="$HOME/secure-backups/tutorwise-credentials/$(date +%Y-%m-%d-%H%M)"
mkdir -p "$BACKUP_DIR"

echo "🔐 Backing up Tutorwise credential files..."

# Copy files with error handling
if [ -f ".env.local" ]; then
    cp .env.local "$BACKUP_DIR/" && echo "✅ .env.local backed up ($(stat -f%z .env.local) bytes)"
else
    echo "⚠️  .env.local not found"
fi

if [ -f "oauth-credentials.json" ]; then
    cp oauth-credentials.json "$BACKUP_DIR/" && echo "✅ oauth-credentials.json backed up ($(stat -f%z oauth-credentials.json) bytes)"
else
    echo "⚠️  oauth-credentials.json not found"
fi

if [ -f "service-account-key.json" ]; then
    cp service-account-key.json "$BACKUP_DIR/" && echo "✅ service-account-key.json backed up ($(stat -f%z service-account-key.json) bytes)"
else
    echo "⚠️  service-account-key.json not found"
fi

# Create compressed backup
cd "$HOME/secure-backups/tutorwise-credentials"
ARCHIVE_NAME="tutorwise-creds-$(date +%Y-%m-%d-%H%M).tar.gz"
tar -czf "$ARCHIVE_NAME" "$(date +%Y-%m-%d-%H%M)/"

echo ""
echo "📦 Compressed backup created:"
echo "   $HOME/secure-backups/tutorwise-credentials/$ARCHIVE_NAME"

# Show backup size
BACKUP_SIZE=$(stat -f%z "$ARCHIVE_NAME")
echo "   Size: $BACKUP_SIZE bytes"

# Clean up temp directory
rm -rf "$BACKUP_DIR"

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lat "$HOME/secure-backups/tutorwise-credentials/" | head -5

echo ""
echo "✅ Backup completed successfully!"
echo "💡 Run this script before any major project changes"