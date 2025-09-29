# 🔐 Credential Files Backup & Recovery Guide

## 📋 Critical Files to Backup

### **Current Credential Files** (as of 2025-09-29):
```
✅ .env.local                    (5,515 bytes) - Environment variables
✅ oauth-credentials.json        (405 bytes)   - Google OAuth credentials
✅ service-account-key.json      (2,390 bytes) - Google Cloud service account
```

## 🛡️ Secure Backup Strategy

### **Option 1: Local Encrypted Backup (Recommended)**
```bash
# Create encrypted backup directory
mkdir -p ~/secure-backups/tutorwise-credentials/$(date +%Y-%m-%d)

# Copy credential files
cp .env.local ~/secure-backups/tutorwise-credentials/$(date +%Y-%m-%d)/
cp oauth-credentials.json ~/secure-backups/tutorwise-credentials/$(date +%Y-%m-%d)/
cp service-account-key.json ~/secure-backups/tutorwise-credentials/$(date +%Y-%m-%d)/

# Create encrypted archive
cd ~/secure-backups/tutorwise-credentials/
tar -czf tutorwise-creds-$(date +%Y-%m-%d).tar.gz $(date +%Y-%m-%d)/
```

### **Option 2: Secure Cloud Backup**
- **iCloud Keychain** (macOS): Most secure for small files
- **1Password/LastPass**: Store as secure notes
- **Encrypted USB drive**: Physical backup

### **Option 3: Git with Private Repository**
```bash
# Create private backup repo (ONE TIME ONLY)
git init tutorwise-credentials-backup
git remote add origin https://github.com/yourusername/tutorwise-creds-private.git

# Regular backup process
cp .env.local oauth-credentials.json service-account-key.json ./tutorwise-credentials-backup/
cd tutorwise-credentials-backup
git add .
git commit -m "Backup credentials $(date +%Y-%m-%d)"
git push origin main
```

## ⚡ Quick Backup Script

Create this script for easy backups:

```bash
#!/bin/bash
# File: backup-credentials.sh

BACKUP_DIR="$HOME/secure-backups/tutorwise-credentials/$(date +%Y-%m-%d-%H%M)"
mkdir -p "$BACKUP_DIR"

echo "🔐 Backing up credential files..."

# Copy files
cp .env.local "$BACKUP_DIR/" 2>/dev/null && echo "✅ .env.local backed up"
cp oauth-credentials.json "$BACKUP_DIR/" 2>/dev/null && echo "✅ oauth-credentials.json backed up"
cp service-account-key.json "$BACKUP_DIR/" 2>/dev/null && echo "✅ service-account-key.json backed up"

# Create compressed backup
cd "$HOME/secure-backups/tutorwise-credentials"
tar -czf "tutorwise-creds-$(date +%Y-%m-%d-%H%M).tar.gz" "$(date +%Y-%m-%d-%H%M)/"

echo "📦 Compressed backup created at:"
echo "$HOME/secure-backups/tutorwise-credentials/tutorwise-creds-$(date +%Y-%m-%d-%H%M).tar.gz"

# Clean up temp directory
rm -rf "$BACKUP_DIR"

echo "✅ Backup completed successfully!"
```

## 🚨 Recovery Process

If credential files are lost:

### **Step 1: Restore from Backup**
```bash
# Extract latest backup
cd ~/secure-backups/tutorwise-credentials/
tar -xzf tutorwise-creds-YYYY-MM-DD-HHMM.tar.gz

# Copy back to project
cp YYYY-MM-DD-HHMM/.env.local /Users/michaelquan/projects/tutorwise/
cp YYYY-MM-DD-HHMM/oauth-credentials.json /Users/michaelquan/projects/tutorwise/
cp YYYY-MM-DD-HHMM/service-account-key.json /Users/michaelquan/projects/tutorwise/
```

### **Step 2: Verify Credentials Work**
```bash
# Test environment variables
node tools/scripts/utilities/load-env.js

# Test Gemini integration
npm run gemini:models

# Test Google APIs
node tools/scripts/utilities/test-integrations.js gemini
```

## 📅 Backup Schedule

### **Automated Reminder** (Add to calendar):
- **Weekly**: Manual backup before major changes
- **Before major updates**: Always backup credentials first
- **After credential changes**: Immediate backup

### **Pre-Change Protocol**:
```bash
# ALWAYS run before major changes:
./backup-credentials.sh
echo "✅ Credentials backed up - safe to proceed with changes"
```

## 🔄 Version History

| Date | Files | Notes |
|------|-------|-------|
| 2025-09-29 | .env.local (5.5KB), oauth-credentials.json (405B), service-account-key.json (2.4KB) | Initial backup setup |

---

**⚠️ IMPORTANT**: Never commit credential files to public repositories!
**✅ REMEMBER**: Backup before any major system changes!

**Last Updated**: September 29, 2025
**Next Review**: Before next major feature development