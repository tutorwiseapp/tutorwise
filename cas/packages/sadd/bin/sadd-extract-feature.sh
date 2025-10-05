#!/bin/bash
# SADD Feature Extractor
# Extracts a feature from TutorWise into a portable package
# Usage: ./sadd-extract-feature.sh <feature-name> [output-dir]

set -e

FEATURE_NAME=$1
OUTPUT_DIR=${2:-"/tmp/sadd-extracts"}
CATALOG="$(cd "$(dirname "${BASH_SOURCE[0]}")/../config" && pwd)/sadd-feature-catalog.json"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Validation
if [ -z "$FEATURE_NAME" ]; then
  echo -e "${RED}❌ Error: Feature name required${NC}"
  echo "Usage: $0 <feature-name> [output-dir]"
  echo ""
  echo "Available features:"
  jq -r '.features | keys[]' "$CATALOG" | sed 's/^/  - /'
  exit 1
fi

# Check if feature exists in catalog
if ! jq -e ".features[\"$FEATURE_NAME\"]" "$CATALOG" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Feature '$FEATURE_NAME' not found in catalog${NC}"
  echo ""
  echo "Available features:"
  jq -r '.features | keys[]' "$CATALOG" | sed 's/^/  - /'
  exit 1
fi

# Read feature definition from catalog
echo -e "${BLUE}📖 Reading feature definition from catalog...${NC}"
FEATURE_FILES=$(jq -r ".features[\"$FEATURE_NAME\"].files[]" "$CATALOG")
SOURCE_DIR=$(jq -r ".features[\"$FEATURE_NAME\"].source" "$CATALOG")
VERSION=$(jq -r ".features[\"$FEATURE_NAME\"].tutorwise_version" "$CATALOG")
FEATURE_TYPE=$(jq -r ".features[\"$FEATURE_NAME\"].type" "$CATALOG")
ADAPTATIONS=$(jq -c ".features[\"$FEATURE_NAME\"].adaptations_required" "$CATALOG")

echo -e "${GREEN}✓${NC} Feature: $FEATURE_NAME"
echo -e "${GREEN}✓${NC} Version: $VERSION"
echo -e "${GREEN}✓${NC} Type: $FEATURE_TYPE"
echo -e "${GREEN}✓${NC} Source: $SOURCE_DIR"
echo ""

# Create extraction package directory
EXTRACT_DIR="$OUTPUT_DIR/$FEATURE_NAME-v$VERSION"
echo -e "${BLUE}📦 Creating extraction package: $EXTRACT_DIR${NC}"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

# Copy files
FILE_COUNT=0
echo -e "${BLUE}📂 Copying files...${NC}"
for file in $FEATURE_FILES; do
  FULL_PATH="$PROJECT_ROOT/$file"

  if [ ! -f "$FULL_PATH" ]; then
    echo -e "${YELLOW}⚠️  File not found (skipping): $file${NC}"
    continue
  fi

  # Preserve directory structure
  DEST_FILE="$EXTRACT_DIR/$file"
  mkdir -p "$(dirname "$DEST_FILE")"
  cp "$FULL_PATH" "$DEST_FILE"

  echo -e "${GREEN}  ✓${NC} $file"
  FILE_COUNT=$((FILE_COUNT + 1))
done

echo ""
echo -e "${GREEN}✓${NC} Copied $FILE_COUNT files"
echo ""

# Create metadata file
echo -e "${BLUE}📝 Creating metadata file...${NC}"
cat > "$EXTRACT_DIR/sadd-extract-metadata.json" <<EOF
{
  "feature": "$FEATURE_NAME",
  "source": "tutorwise",
  "version": "$VERSION",
  "type": "$FEATURE_TYPE",
  "extracted_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "extracted_by": "sadd-extract-feature.sh",
  "files": $(echo "$FEATURE_FILES" | jq -R -s -c 'split("\n")[:-1]'),
  "file_count": $FILE_COUNT,
  "source_directory": "$SOURCE_DIR",
  "adaptations_required": $ADAPTATIONS,
  "catalog_path": "$CATALOG"
}
EOF

# Create git history file
echo -e "${BLUE}📜 Capturing git history...${NC}"
cd "$PROJECT_ROOT"
{
  echo "# Git History for $FEATURE_NAME"
  echo "# Last 20 commits affecting this feature"
  echo ""
  git log --oneline --all -- $FEATURE_FILES | head -20
} > "$EXTRACT_DIR/git-history.txt"

# Create recent changes patch
echo -e "${BLUE}🔄 Creating recent changes patch...${NC}"
git diff HEAD~5 HEAD -- $FEATURE_FILES > "$EXTRACT_DIR/recent-changes.patch" 2>/dev/null || true

# Create README for the package
cat > "$EXTRACT_DIR/README.md" <<EOF
# $FEATURE_NAME v$VERSION

**Extracted from:** TutorWise
**Extracted at:** $(date -u +%Y-%m-%d %H:%M:%S UTC)
**Type:** $FEATURE_TYPE

## Description

$(jq -r ".features[\"$FEATURE_NAME\"].description" "$CATALOG")

## Files Included

$FILE_COUNT files:

\`\`\`
$(echo "$FEATURE_FILES" | sed 's/^/- /')
\`\`\`

## Adaptations Required

$(jq -r ".features[\"$FEATURE_NAME\"].adaptations_required[]" "$CATALOG" | sed 's/^/- /')

## Next Steps

1. Review files in this package
2. Run adaptation: \`./sadd-adapt-feature.sh $(basename "$EXTRACT_DIR") vinite\`
3. Review adapted package
4. Apply to Vinite: \`./sadd-apply-feature.sh <adapted-package> /path/to/vinite\`

## Metadata

See \`sadd-extract-metadata.json\` for detailed extraction information.
EOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Feature extraction complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📦 Package:${NC} $(basename "$EXTRACT_DIR")"
echo -e "${BLUE}📍 Location:${NC} $EXTRACT_DIR"
echo -e "${BLUE}📁 Files:${NC} $FILE_COUNT"
echo -e "${BLUE}🔧 Adaptations needed:${NC} $(jq -r ".features[\"$FEATURE_NAME\"].adaptations_required | length" "$CATALOG")"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "  1. Review: ${BLUE}cd $EXTRACT_DIR && cat README.md${NC}"
echo -e "  2. Adapt:  ${BLUE}./cas/packages/sadd/bin/sadd-adapt-feature.sh $(basename "$EXTRACT_DIR") vinite${NC}"
echo ""
