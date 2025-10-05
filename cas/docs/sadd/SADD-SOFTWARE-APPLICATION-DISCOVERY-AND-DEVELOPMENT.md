# MADS - Multiple App Development System
**Full Name:** Multiple App Development System
**Acronym:** MADS
**Version:** 1.0.0
**Purpose:** Develop, mirror, and sync features across multiple apps (TutorWise, Vinite, and future platforms)

---

## 🎯 Problem Statement

**Challenge:**
- TutorWise and Vinite share 95% tech stack (Next.js, Supabase, Stripe)
- Both need similar features (auth, payments, role-based dashboards)
- Separate repos (tutorwise, viniteapp/vinite) for context management
- Need to avoid code duplication while maintaining independence

**Current Pain Points:**
1. ❌ Implementing same feature twice (auth in TutorWise, then Vinite)
2. ❌ Large monorepo causes AI context loss
3. ❌ Features drift between platforms over time
4. ❌ No systematic way to share code across repos

---

## 💡 Solution: MADS (Cross-Platform Feature Mirroring System)

### Core Concept
**"Build once, mirror selectively, adapt as needed"**

```
TutorWise (Source)
    ↓
Feature Catalog (Registry)
    ↓
MADS Migration Tools
    ↓
Vinite (Target) + Platform-specific Adaptations
```

### Key Principles
1. **Source of Truth:** TutorWise is the primary development platform
2. **Selective Mirroring:** Only mirror features that make sense for Vinite
3. **Adaptation Layer:** MADS adapts features for target platform differences
4. **Version Tracking:** Track which version of each feature is in Vinite
5. **Independence:** Vinite can diverge from TutorWise when needed

---

## 🏗️ Architecture

### Component 1: Feature Catalog
**Purpose:** Registry of mirrorable features

**Location:** `tools/mads/mads-feature-catalog.json`

```json
{
  "features": {
    "supabase-auth": {
      "name": "Supabase Authentication",
      "description": "SSR-ready Supabase auth with role-based access",
      "source": "apps/web/src/lib/supabase/",
      "type": "code",
      "platforms": ["tutorwise", "vinite"],
      "tutorwise_version": "2.1.0",
      "vinite_version": "2.0.0",
      "status": "active",
      "adaptations_required": [
        "Role mapping (tutor→provider, client→seeker)",
        "Database schema differences"
      ],
      "files": [
        "apps/web/src/lib/supabase/client.ts",
        "apps/web/src/lib/supabase/server.ts",
        "apps/web/src/lib/supabase/middleware.ts"
      ]
    },
    "stripe-payments": {
      "name": "Stripe Payment Integration",
      "description": "Checkout, webhooks, subscription management",
      "source": "apps/web/src/lib/stripe/",
      "type": "code",
      "platforms": ["tutorwise", "vinite"],
      "tutorwise_version": "1.5.0",
      "vinite_version": "1.5.0",
      "status": "active",
      "adaptations_required": [
        "Pricing model (lessons vs referrals)",
        "Webhook endpoints"
      ],
      "files": [
        "apps/web/src/lib/stripe/client.ts",
        "apps/web/src/lib/stripe/webhooks.ts"
      ]
    },
    "role-based-dashboard": {
      "name": "Role-Based Dashboard",
      "description": "Multi-role dashboard with navigation",
      "source": "apps/web/src/app/dashboard/",
      "type": "feature",
      "platforms": ["tutorwise", "vinite"],
      "tutorwise_version": "3.0.0",
      "vinite_version": "2.8.0",
      "status": "active",
      "adaptations_required": [
        "Remove marketplace/listing features",
        "Add referral tracking views",
        "Role mapping"
      ],
      "files": [
        "apps/web/src/app/dashboard/layout.tsx",
        "apps/web/src/app/dashboard/[role]/",
        "apps/web/src/components/dashboard/"
      ]
    },
    "radix-ui-components": {
      "name": "Radix UI Component Library",
      "description": "Accessible UI components",
      "source": "apps/web/src/components/ui/",
      "type": "components",
      "platforms": ["tutorwise", "vinite"],
      "tutorwise_version": "1.2.0",
      "vinite_version": "1.2.0",
      "status": "synced",
      "adaptations_required": [],
      "files": [
        "apps/web/src/components/ui/*.tsx"
      ]
    }
  },
  "metadata": {
    "last_sync": "2025-10-05",
    "tutorwise_repo": "/Users/michaelquan/projects/tutorwise",
    "vinite_repo": "/Users/michaelquan/projects/vinite",
    "sync_strategy": "selective-manual"
  }
}
```

---

### Component 2: Migration Tools

#### 2.1 Feature Extractor
**Purpose:** Extract feature from TutorWise into portable format

**Location:** `tools/mads/extract-feature.sh`

```bash
#!/bin/bash
# MADS Feature Extractor
# Usage: ./extract-feature.sh <feature-name> [output-dir]

FEATURE_NAME=$1
OUTPUT_DIR=${2:-"/tmp/mads-extracts"}
CATALOG="tools/mads/mads-feature-catalog.json"

# Read feature definition from catalog
FEATURE_FILES=$(jq -r ".features[\"$FEATURE_NAME\"].files[]" "$CATALOG")
SOURCE_DIR=$(jq -r ".features[\"$FEATURE_NAME\"].source" "$CATALOG")
VERSION=$(jq -r ".features[\"$FEATURE_NAME\"].tutorwise_version" "$CATALOG")

# Create extraction package
EXTRACT_DIR="$OUTPUT_DIR/$FEATURE_NAME-v$VERSION"
mkdir -p "$EXTRACT_DIR"

# Copy files
for file in $FEATURE_FILES; do
  # Preserve directory structure
  DEST_FILE="$EXTRACT_DIR/$file"
  mkdir -p "$(dirname "$DEST_FILE")"
  cp "$file" "$DEST_FILE"
done

# Create metadata
cat > "$EXTRACT_DIR/mads-extract-metadata.json" <<EOF
{
  "feature": "$FEATURE_NAME",
  "source": "tutorwise",
  "version": "$VERSION",
  "extracted_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": $(echo "$FEATURE_FILES" | jq -R -s -c 'split("\n")[:-1]'),
  "adaptations_required": $(jq -c ".features[\"$FEATURE_NAME\"].adaptations_required" "$CATALOG")
}
EOF

# Create git patch
git log --oneline --all -- $FEATURE_FILES | head -20 > "$EXTRACT_DIR/git-history.txt"
git diff HEAD~5 HEAD -- $FEATURE_FILES > "$EXTRACT_DIR/recent-changes.patch"

echo "✅ Feature extracted to: $EXTRACT_DIR"
echo "📦 Package: $FEATURE_NAME v$VERSION"
echo "📁 Files: $(echo "$FEATURE_FILES" | wc -l)"
```

---

#### 2.2 Feature Adapter
**Purpose:** Adapt extracted feature for Vinite

**Location:** `tools/mads/adapt-feature.sh`

```bash
#!/bin/bash
# MADS Feature Adapter
# Usage: ./adapt-feature.sh <feature-package-dir> <target-platform>

PACKAGE_DIR=$1
TARGET_PLATFORM=${2:-"vinite"}
METADATA="$PACKAGE_DIR/mads-extract-metadata.json"

FEATURE_NAME=$(jq -r '.feature' "$METADATA")
ADAPTATIONS=$(jq -r '.adaptations_required[]' "$METADATA")

echo "🔄 Adapting feature: $FEATURE_NAME"
echo "🎯 Target platform: $TARGET_PLATFORM"
echo ""
echo "Required adaptations:"
echo "$ADAPTATIONS"
echo ""

# Load adaptation rules
RULES_FILE="tools/mads/vinite-adaptations/vinite-$FEATURE_NAME.rules.json"

if [ -f "$RULES_FILE" ]; then
  echo "✅ Adaptation rules found: $RULES_FILE"

  # Apply automated transformations
  node tools/mads/apply-adaptations.js "$PACKAGE_DIR" "$RULES_FILE"
else
  echo "⚠️  No adaptation rules found. Manual adaptation required."
  echo "💡 Create rules at: $RULES_FILE"
fi

# Create adapted package
ADAPTED_DIR="$PACKAGE_DIR-vinite-adapted"
cp -r "$PACKAGE_DIR" "$ADAPTED_DIR"

echo ""
echo "✅ Adapted package ready: $ADAPTED_DIR"
echo "📝 Review changes before applying to $TARGET_PLATFORM"
```

---

#### 2.3 Feature Applicator
**Purpose:** Apply adapted feature to Vinite repo

**Location:** `tools/mads/apply-feature.sh`

```bash
#!/bin/bash
# MADS Feature Applicator
# Usage: ./apply-feature.sh <adapted-package-dir> <vinite-repo-path>

PACKAGE_DIR=$1
VINITE_REPO=${2:-"/Users/michaelquan/projects/vinite"}
METADATA="$PACKAGE_DIR/mads-extract-metadata.json"

FEATURE_NAME=$(jq -r '.feature' "$METADATA")
VERSION=$(jq -r '.version' "$METADATA")

echo "📤 Applying feature to Vinite"
echo "Feature: $FEATURE_NAME v$VERSION"
echo "Target: $VINITE_REPO"
echo ""

# Safety check
if [ ! -d "$VINITE_REPO/.git" ]; then
  echo "❌ Error: $VINITE_REPO is not a git repository"
  exit 1
fi

# Create branch in Vinite
cd "$VINITE_REPO"
BRANCH_NAME="mads/$FEATURE_NAME-v$VERSION-$(date +%Y%m%d)"
git checkout -b "$BRANCH_NAME"

# Copy files to Vinite
# (respecting Vinite's directory structure)
FILES=$(jq -r '.files[]' "$METADATA")
for file in $FILES; do
  # Map TutorWise paths to Vinite paths
  VINITE_PATH=$(echo "$file" | sed 's|apps/web/src|src|')

  DEST="$VINITE_REPO/$VINITE_PATH"
  mkdir -p "$(dirname "$DEST")"
  cp "$PACKAGE_DIR/$file" "$DEST"

  echo "  ✅ $VINITE_PATH"
done

# Create MADS tracking file
mkdir -p "$VINITE_REPO/.mads"
cat > "$VINITE_REPO/.mads/vinite-$FEATURE_NAME.json" <<EOF
{
  "feature": "$FEATURE_NAME",
  "source": "tutorwise",
  "source_version": "$VERSION",
  "applied_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "$BRANCH_NAME",
  "status": "applied-needs-review"
}
EOF

# Commit
git add .
git commit -m "MADS: Apply $FEATURE_NAME v$VERSION from TutorWise

Mirrored from: tutorwise/$FEATURE_NAME
Version: $VERSION
Applied: $(date -u +%Y-%m-%d)

Changes require review and testing before merge.
See .mads/vinite-$FEATURE_NAME.json for tracking info."

echo ""
echo "✅ Feature applied to branch: $BRANCH_NAME"
echo "📝 Next steps:"
echo "   1. cd $VINITE_REPO"
echo "   2. Review changes: git diff main"
echo "   3. Test feature: npm run dev"
echo "   4. Merge when ready: git checkout main && git merge $BRANCH_NAME"
```

---

### Component 3: Adaptation Rules Engine

**Purpose:** Automated transformations for platform differences

**Location:** `tools/mads/vinite-adaptations/`

**Example:** `vinite-supabase-auth.rules.json`
```json
{
  "feature": "supabase-auth",
  "target": "vinite",
  "rules": [
    {
      "type": "string_replace",
      "pattern": "role: 'tutor'",
      "replacement": "role: 'provider'",
      "files": ["*.ts", "*.tsx"]
    },
    {
      "type": "string_replace",
      "pattern": "role: 'client'",
      "replacement": "role: 'seeker'",
      "files": ["*.ts", "*.tsx"]
    },
    {
      "type": "import_rewrite",
      "from": "@/lib/supabase",
      "to": "@/lib/supabase",
      "note": "Same structure, no change needed"
    },
    {
      "type": "type_mapping",
      "mappings": {
        "TutorProfile": "ProviderProfile",
        "ClientProfile": "SeekerProfile",
        "ServiceListing": null
      }
    },
    {
      "type": "file_exclusion",
      "exclude": [
        "**/marketplace/**",
        "**/service-listing/**"
      ],
      "reason": "Vinite has no marketplace"
    }
  ]
}
```

**Automation script:** `tools/mads/apply-adaptations.js`
```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function applyAdaptations(packageDir, rulesFile) {
  const rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));

  console.log(`Applying ${rules.rules.length} adaptation rules...`);

  rules.rules.forEach((rule, index) => {
    console.log(`\n[${index + 1}/${rules.rules.length}] ${rule.type}`);

    switch (rule.type) {
      case 'string_replace':
        applyStringReplace(packageDir, rule);
        break;
      case 'import_rewrite':
        applyImportRewrite(packageDir, rule);
        break;
      case 'type_mapping':
        applyTypeMapping(packageDir, rule);
        break;
      case 'file_exclusion':
        applyFileExclusion(packageDir, rule);
        break;
      default:
        console.warn(`Unknown rule type: ${rule.type}`);
    }
  });

  console.log('\n✅ All adaptations applied');
}

function applyStringReplace(packageDir, rule) {
  const files = glob.sync(path.join(packageDir, '**', rule.files.join('|')));

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    content = content.replace(
      new RegExp(rule.pattern, 'g'),
      rule.replacement
    );

    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ ${path.relative(packageDir, file)}`);
    }
  });
}

function applyTypeMapping(packageDir, rule) {
  const files = glob.sync(path.join(packageDir, '**', '*.{ts,tsx}'));

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    Object.entries(rule.mappings).forEach(([from, to]) => {
      if (to === null) {
        // Remove references to this type
        content = content.replace(
          new RegExp(`import.*${from}.*from.*\n`, 'g'),
          ''
        );
      } else {
        // Rename type
        content = content.replace(
          new RegExp(`\\b${from}\\b`, 'g'),
          to
        );
      }
    });

    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log(`  ✅ ${path.relative(packageDir, file)}`);
    }
  });
}

function applyFileExclusion(packageDir, rule) {
  rule.exclude.forEach(pattern => {
    const files = glob.sync(path.join(packageDir, pattern));
    files.forEach(file => {
      fs.unlinkSync(file);
      console.log(`  🗑️  ${path.relative(packageDir, file)} (${rule.reason})`);
    });
  });
}

module.exports = { applyAdaptations };

// CLI usage
if (require.main === module) {
  const [packageDir, rulesFile] = process.argv.slice(2);
  applyAdaptations(packageDir, rulesFile);
}
```

---

### Component 4: Multi-Repo CAS Management

**Purpose:** CAS manages both TutorWise and Vinite repos

**Location:** `~/.config/cas/projects.json`

```json
{
  "projects": {
    "tutorwise": {
      "name": "TutorWise Marketplace",
      "root": "/Users/michaelquan/projects/tutorwise",
      "type": "monorepo",
      "services": ["tutorwise-web", "tutorwise-api", "redis", "neo4j"],
      "deployment": {
        "frontend": "vercel/tutorwise",
        "backend": "railway/tutorwise"
      }
    },
    "vinite": {
      "name": "Vinite Referral Platform",
      "root": "/Users/michaelquan/projects/vinite",
      "type": "standalone",
      "services": ["vinite-web", "vinite-api", "redis", "neo4j"],
      "deployment": {
        "frontend": "vercel/vinite",
        "backend": "railway/vinite"
      },
      "mads": {
        "enabled": true,
        "source": "tutorwise",
        "features": ["supabase-auth", "stripe-payments", "role-based-dashboard"]
      }
    }
  }
}
```

**Updated CAS commands:**
```bash
# Start both projects
cas start --all

# Start specific project
cas start tutorwise
cas start vinite

# MADS operations
cas mads sync supabase-auth tutorwise vinite
cas mads status vinite
cas mads list-features
```

---

## 🔄 MADS Workflow

### Scenario 1: Mirror New Feature (First Time)

```bash
# 1. Developer builds feature in TutorWise
cd /Users/michaelquan/projects/tutorwise
# ... develop "social-login" feature ...
git commit -m "Add social login (Google, GitHub)"

# 2. Register feature in catalog
node tools/mads/register-feature.js \
  --name="social-login" \
  --source="apps/web/src/lib/auth/social/" \
  --version="1.0.0" \
  --platforms="tutorwise,vinite"

# 3. Extract feature
./tools/mads/extract-feature.sh social-login

# 4. Create adaptation rules
cat > tools/mads/vinite-adaptations/vinite-social-login.rules.json <<EOF
{
  "feature": "social-login",
  "target": "vinite",
  "rules": [
    {
      "type": "string_replace",
      "pattern": "redirect_url: '/dashboard/client'",
      "replacement": "redirect_url: '/dashboard/seeker'"
    }
  ]
}
EOF

# 5. Adapt for Vinite
./tools/mads/adapt-feature.sh /tmp/mads-extracts/social-login-v1.0.0 vinite

# 6. Review adaptations
cd /tmp/mads-extracts/social-login-v1.0.0-vinite-adapted
# ... manual review ...

# 7. Apply to Vinite
./tools/mads/apply-feature.sh \
  /tmp/mads-extracts/social-login-v1.0.0-vinite-adapted \
  /Users/michaelquan/projects/vinite

# 8. Test in Vinite
cd /Users/michaelquan/projects/vinite
npm install
npm run dev
# ... test social login ...

# 9. Merge when ready
git checkout main
git merge mads/social-login-v1.0.0-20251005
git push origin main

# 10. Update catalog
node tools/mads/update-catalog.js \
  --feature="social-login" \
  --vinite-version="1.0.0" \
  --status="synced"
```

---

### Scenario 2: Update Existing Feature

```bash
# 1. Update feature in TutorWise
cd /Users/michaelquan/projects/tutorwise
# ... improve "supabase-auth" to v2.2.0 ...
git commit -m "supabase-auth: Add MFA support"

# 2. Extract updated version
./tools/mads/extract-feature.sh supabase-auth

# 3. Compare with Vinite version
./tools/mads/diff-feature.sh supabase-auth tutorwise vinite
# Output:
# TutorWise: v2.2.0 (MFA support added)
# Vinite:    v2.0.0 (2 versions behind)
# New changes:
#   - MFA enrollment flow
#   - MFA verification
#   - Backup codes

# 4. Apply update to Vinite (reuses existing adaptation rules)
./tools/mads/apply-feature.sh \
  /tmp/mads-extracts/supabase-auth-v2.2.0-vinite-adapted \
  /Users/michaelquan/projects/vinite

# 5. Test and merge
cd /Users/michaelquan/projects/vinite
# ... test, merge ...
```

---

### Scenario 3: Vinite-Specific Divergence

```bash
# Vinite needs custom behavior (don't mirror back to TutorWise)
cd /Users/michaelquan/projects/vinite

# Create Vinite-only feature
# ... develop "referral-link-generator" (Vinite-specific) ...

# Mark as diverged in catalog
node tools/mads/mark-diverged.js \
  --feature="role-based-dashboard" \
  --platform="vinite" \
  --reason="Vinite has referral tracking, TutorWise has marketplace"

# Future MADS syncs skip diverged features
```

---

## 📊 Feature Catalog Dashboard

**Location:** `tools/mads/dashboard.html`

**Features:**
- List all mirrorable features
- Version comparison (TutorWise vs Vinite)
- Sync status (synced, outdated, diverged)
- Last sync date
- Required adaptations

**Example view:**
```
┌─────────────────────┬──────────────┬─────────────┬────────────┬─────────────┐
│ Feature             │ TutorWise    │ Vinite      │ Status     │ Last Sync   │
├─────────────────────┼──────────────┼─────────────┼────────────┼─────────────┤
│ supabase-auth       │ v2.2.0       │ v2.0.0      │ Outdated   │ 2025-09-15  │
│ stripe-payments     │ v1.5.0       │ v1.5.0      │ ✅ Synced  │ 2025-10-01  │
│ role-dashboard      │ v3.0.0       │ v2.8.0 (D)  │ Diverged   │ 2025-08-20  │
│ radix-ui-components │ v1.2.0       │ v1.2.0      │ ✅ Synced  │ 2025-10-05  │
│ social-login        │ v1.0.0       │ -           │ Not synced │ -           │
└─────────────────────┴──────────────┴─────────────┴────────────┴─────────────┘

(D) = Diverged (intentional platform-specific differences)
```

---

## 🎯 Benefits of MADS

### 1. Developer Experience
✅ Build features once in TutorWise
✅ Mirror to Vinite with one command
✅ Automated adaptations reduce manual work
✅ Version tracking prevents drift

### 2. Code Quality
✅ Single source of truth (TutorWise)
✅ Consistent patterns across platforms
✅ Tested in TutorWise before mirroring
✅ Adaptation rules are reusable

### 3. Context Management
✅ Keep repos separate (no AI context loss)
✅ Focused development (one platform at a time)
✅ Clean git history per project
✅ Independent deployments

### 4. Flexibility
✅ Selective mirroring (choose what to share)
✅ Platform-specific divergence allowed
✅ Manual override when needed
✅ Future: Mirror from Vinite → TutorWise if beneficial

---

## 📁 File Structure

```
tutorwise/
├── tools/
│   └── mads/
│       ├── mads-feature-catalog.json     # Registry of features
│       ├── mads-extract-feature.sh       # Extract from TutorWise
│       ├── mads-adapt-feature.sh         # Adapt for target platform
│       ├── mads-apply-feature.sh         # Apply to Vinite
│       ├── mads-apply-adaptations.js     # Automation engine
│       ├── mads-diff-feature.sh          # Compare versions
│       ├── mads-register-feature.js      # Add to catalog
│       ├── mads-update-catalog.js        # Update versions
│       ├── mads-mark-diverged.js         # Mark diverged features
│       ├── mads-dashboard.html           # Visual dashboard
│       └── vinite-adaptations/           # Vinite-specific adaptation rules
│           ├── vinite-supabase-auth.rules.json
│           ├── vinite-stripe-payments.rules.json
│           └── vinite-role-dashboard.rules.json
└── docs/
    └── MADS-MULTIPLE-APP-DEVELOPMENT-SYSTEM.md

vinite/
└── .mads/                                # MADS tracking
    ├── vinite-supabase-auth.json
    ├── vinite-stripe-payments.json
    └── vinite-role-dashboard.json
```

---

## 🚀 Implementation Plan

### Phase 1: Foundation (Week 1)
- [x] Create MADS documentation
- [ ] Build feature-catalog.json
- [ ] Create extraction scripts
- [ ] Test with one feature (radix-ui-components)

### Phase 2: Automation (Week 2)
- [ ] Build adaptation rules engine
- [ ] Create apply-adaptations.js
- [ ] Test automated transformations
- [ ] Create 3 adaptation rule files

### Phase 3: Integration (Week 3)
- [ ] Update CAS for multi-repo support
- [ ] Add MADS commands to CAS CLI
- [ ] Create feature dashboard
- [ ] Document workflow

### Phase 4: Production (Week 4)
- [ ] Mirror 5 core features to Vinite
- [ ] Test Vinite with mirrored features
- [ ] Validate deployments work
- [ ] Create video tutorial

---

## 📚 Usage Examples

### Quick Reference

```bash
# List all features
cas mads list

# Check sync status
cas mads status vinite

# Mirror feature
cas mads mirror supabase-auth tutorwise vinite

# Compare versions
cas mads diff social-login

# Update all outdated features
cas mads sync-all vinite
```

---

## ✅ Success Criteria

**MADS is successful when:**
1. ✅ TutorWise → Vinite feature sync takes <30 minutes
2. ✅ 80%+ of code is automatically adapted
3. ✅ Version drift is visible in dashboard
4. ✅ Both platforms maintain independence
5. ✅ AI sessions stay focused (no context loss)

---

**System Name:** MADS (Cross-Platform Feature Mirroring System)
**Status:** Design Complete → Ready for Implementation
**Next Step:** Build Phase 1 (Foundation)
