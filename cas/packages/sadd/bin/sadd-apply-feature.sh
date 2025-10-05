#!/bin/bash
# SADD Feature Applicator
# Applies an adapted feature package to a target platform repository
# Usage: ./sadd-apply-feature.sh <adapted-package-dir> <target-repo-path>

set -e

PACKAGE_DIR=$1
TARGET_REPO=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Validation
if [ -z "$PACKAGE_DIR" ] || [ -z "$TARGET_REPO" ]; then
  echo -e "${RED}❌ Error: Both package directory and target repo required${NC}"
  echo "Usage: $0 <adapted-package-dir> <target-repo-path>"
  echo ""
  echo "Example:"
  echo "  $0 /tmp/sadd-extracts/radix-ui-components-v1.2.0-vinite-adapted /Users/user/projects/vinite"
  exit 1
fi

# Handle relative paths
if [[ "$PACKAGE_DIR" != /* ]]; then
  PACKAGE_DIR="/tmp/sadd-extracts/$PACKAGE_DIR"
fi

if [ ! -d "$PACKAGE_DIR" ]; then
  echo -e "${RED}❌ Error: Package directory not found: $PACKAGE_DIR${NC}"
  exit 1
fi

if [ ! -d "$TARGET_REPO" ]; then
  echo -e "${RED}❌ Error: Target repository not found: $TARGET_REPO${NC}"
  exit 1
fi

# Check metadata files
EXTRACT_METADATA="$PACKAGE_DIR/sadd-extract-metadata.json"
ADAPT_METADATA="$PACKAGE_DIR/sadd-adapt-metadata.json"

if [ ! -f "$EXTRACT_METADATA" ]; then
  echo -e "${RED}❌ Error: Not a valid SADD package (missing sadd-extract-metadata.json)${NC}"
  exit 1
fi

# Read metadata
FEATURE_NAME=$(jq -r '.feature' "$EXTRACT_METADATA")
VERSION=$(jq -r '.version' "$EXTRACT_METADATA")
FILES=$(jq -r '.files[]' "$EXTRACT_METADATA")

# Determine target platform from adapted metadata or directory name
if [ -f "$ADAPT_METADATA" ]; then
  TARGET_PLATFORM=$(jq -r '.target_platform' "$ADAPT_METADATA")
else
  # Extract from directory name (e.g., "package-vinite-adapted" → "vinite")
  TARGET_PLATFORM=$(basename "$PACKAGE_DIR" | sed 's/.*-\([^-]*\)-adapted$/\1/')
fi

# Safety check: is target repo a git repository?
if [ ! -d "$TARGET_REPO/.git" ]; then
  echo -e "${RED}❌ Error: $TARGET_REPO is not a git repository${NC}"
  echo "For safety, SADD only applies features to git repositories."
  exit 1
fi

echo -e "${BLUE}📤 SADD Feature Applicator${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓${NC} Feature: $FEATURE_NAME v$VERSION"
echo -e "${GREEN}✓${NC} Target platform: $TARGET_PLATFORM"
echo -e "${GREEN}✓${NC} Target repo: $(basename "$TARGET_REPO")"
echo -e "${GREEN}✓${NC} Repo path: $TARGET_REPO"
echo ""

# Confirm action
read -p "$(echo -e ${YELLOW}Apply feature to $TARGET_PLATFORM repository? [y/N]:${NC} )" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Cancelled by user${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}🔍 Checking repository status...${NC}"

# Create branch in target repo
cd "$TARGET_REPO"
CURRENT_BRANCH=$(git branch --show-current)
BRANCH_NAME="sadd/$FEATURE_NAME-v$VERSION-$(date +%Y%m%d-%H%M%S)"

echo -e "${GREEN}✓${NC} Current branch: $CURRENT_BRANCH"
echo -e "${BLUE}🌿 Creating feature branch: $BRANCH_NAME${NC}"
git checkout -b "$BRANCH_NAME"

echo ""
echo -e "${BLUE}📂 Copying files to $TARGET_PLATFORM repository...${NC}"

# Track applied files
APPLIED_FILES=()
SKIPPED_FILES=()

for file in $FILES; do
  # Map TutorWise paths to target platform paths
  # Default: strip "apps/web/" prefix (customizable per platform)
  TARGET_PATH=$(echo "$file" | sed 's|^apps/web/||')

  SOURCE_FILE="$PACKAGE_DIR/$file"

  if [ ! -f "$SOURCE_FILE" ]; then
    echo -e "${YELLOW}  ⚠️  Source file not found (skipping): $file${NC}"
    SKIPPED_FILES+=("$file")
    continue
  fi

  DEST_FILE="$TARGET_REPO/$TARGET_PATH"
  mkdir -p "$(dirname "$DEST_FILE")"
  cp "$SOURCE_FILE" "$DEST_FILE"

  echo -e "${GREEN}  ✓${NC} $TARGET_PATH"
  APPLIED_FILES+=("$TARGET_PATH")
done

echo ""
echo -e "${GREEN}✓${NC} Applied ${#APPLIED_FILES[@]} files"
if [ ${#SKIPPED_FILES[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠️${NC}  Skipped ${#SKIPPED_FILES[@]} files (not found in package)"
fi

# Create SADD tracking file in target repo
echo ""
echo -e "${BLUE}📝 Creating SADD tracking file...${NC}"
mkdir -p "$TARGET_REPO/.sadd"
TRACKING_FILE="$TARGET_REPO/.sadd/$TARGET_PLATFORM-$FEATURE_NAME.json"

cat > "$TRACKING_FILE" <<EOF
{
  "feature": "$FEATURE_NAME",
  "source": "tutorwise",
  "source_version": "$VERSION",
  "target_platform": "$TARGET_PLATFORM",
  "applied_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "applied_by": "sadd-apply-feature.sh",
  "branch": "$BRANCH_NAME",
  "status": "applied-needs-review",
  "files_applied": $(printf '%s\n' "${APPLIED_FILES[@]}" | jq -R . | jq -s .),
  "files_skipped": $(printf '%s\n' "${SKIPPED_FILES[@]}" | jq -R . | jq -s .),
  "package_source": "$(basename "$PACKAGE_DIR")"
}
EOF

echo -e "${GREEN}✓${NC} Created: .sadd/$TARGET_PLATFORM-$FEATURE_NAME.json"

# Stage changes
echo ""
echo -e "${BLUE}📦 Staging changes...${NC}"
git add .

# Create commit
COMMIT_MSG="sadd: Apply $FEATURE_NAME v$VERSION to $TARGET_PLATFORM

Feature: $FEATURE_NAME
Source: TutorWise v$VERSION
Target: $TARGET_PLATFORM
Applied: $(date -u +%Y-%m-%d)
Branch: $BRANCH_NAME

Files applied: ${#APPLIED_FILES[@]}
Files skipped: ${#SKIPPED_FILES[@]}

Changes require review and testing before merge.
Tracking: .sadd/$TARGET_PLATFORM-$FEATURE_NAME.json

---
Generated by SADD (Multiple App Development System)"

git commit -m "$COMMIT_MSG"

echo -e "${GREEN}✓${NC} Changes committed"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Feature applied successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  • Feature: $FEATURE_NAME v$VERSION"
echo -e "  • Platform: $TARGET_PLATFORM"
echo -e "  • Branch: $BRANCH_NAME"
echo -e "  • Files: ${#APPLIED_FILES[@]} applied, ${#SKIPPED_FILES[@]} skipped"
echo -e "  • Tracking: .sadd/$TARGET_PLATFORM-$FEATURE_NAME.json"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "  1. Review changes: ${BLUE}git diff $CURRENT_BRANCH${NC}"
echo -e "  2. Test feature:   ${BLUE}npm run dev${NC}"
echo -e "  3. Run tests:      ${BLUE}npm test${NC}"
echo -e "  4. When ready, merge:"
echo -e "     ${BLUE}git checkout $CURRENT_BRANCH${NC}"
echo -e "     ${BLUE}git merge $BRANCH_NAME${NC}"
echo -e "     ${BLUE}git push origin $CURRENT_BRANCH${NC}"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} If you want to discard these changes:"
echo -e "     ${BLUE}git checkout $CURRENT_BRANCH${NC}"
echo -e "     ${BLUE}git branch -D $BRANCH_NAME${NC}"
echo ""
