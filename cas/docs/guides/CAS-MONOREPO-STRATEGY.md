# CAS Monorepo Organization Strategy
## Current State Analysis & Future Structure

**Date:** 2025-10-04
**Status:** Recommendation Document

---

## 🔍 Current Structure Analysis

### ✅ What's Good:

**1. CAS is in `tools/` folder**
```
tools/
├── cas/                    # CAS-specific code
│   ├── agent/             # Autonomous agent
│   └── generate-context.js # Context generator
├── scripts/               # Shared scripts
├── configs/               # Shared configs
└── docs/                  # Documentation
```

**Pros:**
- Clear separation from application code (`apps/`)
- Grouped with development tooling
- Easy to find
- Doesn't pollute application workspace

**2. Monorepo Structure**
```
tutorwise/
├── apps/                  # Applications
│   ├── web/              # Frontend (Next.js)
│   └── api/              # Backend (FastAPI)
├── packages/             # Shared libraries
│   ├── shared-types/
│   └── ui/
└── tools/                # Development tools
    └── cas/              # CAS lives here
```

**Pros:**
- Standard monorepo pattern
- TutorWise apps in `apps/`
- Shared code in `packages/`
- Tools separate in `tools/`

---

## ❌ Issues with Current Structure

### Problem 1: CAS Not a Workspace
```json
// package.json
"workspaces": [
  "apps/*",
  "packages/*"
  // ❌ tools/* not included!
]
```

**Impact:**
- CAS can't have its own `package.json`
- Can't manage CAS dependencies separately
- Can't publish CAS as npm package
- Hard to extract CAS to separate repo later

### Problem 2: Mixed TutorWise + CAS Code
```
tools/
├── cas/                   # CAS (future independent platform)
├── scripts/              # Mix of TutorWise + CAS scripts
├── playwright/           # TutorWise E2E tests
├── rbac/                 # TutorWise RBAC
└── database/             # TutorWise DB scripts
```

**Impact:**
- Unclear what's TutorWise-specific vs CAS
- Hard to extract CAS independently
- Coupling between TutorWise and CAS

### Problem 3: No Clear CAS Package Structure
```
tools/cas/
├── agent/                # Good
└── generate-context.js   # Loose file (not organized)
```

**Should be:**
```
packages/cas/
├── package.json
├── src/
│   ├── agent/
│   ├── cli/
│   ├── core/
│   └── integrations/
├── bin/
│   └── cas
└── README.md
```

---

## 🎯 Recommended Structure (Phase 1: Now)

### Option A: Add CAS to Workspaces

**Make CAS a proper workspace package:**

```
tutorwise/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── shared-types/
│   ├── ui/
│   └── cas/              # ← Move CAS here
│       ├── package.json
│       ├── src/
│       │   ├── agent/
│       │   ├── cli/
│       │   ├── core/
│       │   └── integrations/
│       ├── bin/
│       │   └── cas
│       └── README.md
└── tools/
    ├── scripts/          # TutorWise-specific scripts only
    ├── playwright/
    └── configs/
```

**Changes needed:**
```json
// package.json
"workspaces": [
  "apps/*",
  "packages/*"  // Now includes packages/cas
]

// packages/cas/package.json
{
  "name": "@tutorwise/cas",
  "version": "2.0.0",
  "bin": {
    "cas": "./bin/cas"
  },
  "main": "./src/index.js"
}
```

**Benefits:**
- ✅ CAS is a proper npm package
- ✅ Can be published independently
- ✅ Clear dependency management
- ✅ Easy to extract later
- ✅ Still in same repo (monorepo benefits)

---

### Option B: Keep CAS in Tools (Current)

**If we keep current structure, at least organize it:**

```
tools/cas/
├── package.json          # Add this
├── bin/
│   └── cas               # CLI entry point
├── src/
│   ├── agent/
│   │   ├── core/
│   │   ├── integrations/
│   │   └── config/
│   ├── cli/
│   │   └── commands/
│   ├── core/
│   │   ├── service-manager.js
│   │   └── health-monitor.js
│   └── utils/
├── config/
│   └── default.json
├── docs/
└── README.md
```

**Benefits:**
- ✅ Minimal changes
- ✅ CAS still separate from apps
- ⚠️ Not a workspace (less integration)
- ⚠️ Harder to extract later

---

## 🚀 Recommended Structure (Phase 2: Independent Platform)

### When CAS Becomes Standalone (2026)

**Separate Repository:**

```
cas/                          # New repo: github.com/tutorwise/cas
├── packages/
│   ├── core/                 # @cas/core
│   │   ├── src/
│   │   └── package.json
│   ├── agent/                # @cas/agent
│   │   ├── src/
│   │   └── package.json
│   ├── cli/                  # @cas/cli
│   │   ├── bin/cas
│   │   └── package.json
│   └── integrations/         # @cas/integrations
│       ├── jira/
│       ├── github/
│       └── package.json
├── apps/
│   └── dashboard/            # CAS Cloud Dashboard (SaaS)
│       └── Next.js app
├── docs/
├── examples/
└── package.json
```

**TutorWise continues to use CAS:**

```
tutorwise/
├── apps/
├── packages/
└── package.json
    dependencies: {
      "@cas/cli": "^3.0.0",
      "@cas/agent": "^3.0.0"
    }
```

---

## 📊 Comparison Matrix

| Aspect | Current (tools/cas) | Option A (packages/cas) | Phase 2 (separate repo) |
|--------|---------------------|-------------------------|-------------------------|
| **Organization** | ⚠️ Mixed with tools | ✅ Clear package | ✅ Fully independent |
| **Dependencies** | ❌ No package.json | ✅ Managed | ✅ Published npm |
| **Publishing** | ❌ Can't publish | ✅ Can publish | ✅ Published |
| **Extraction** | ❌ Hard | ⚠️ Medium | ✅ Already done |
| **Monorepo Benefits** | ✅ Yes | ✅ Yes | ❌ No |
| **Independent Development** | ❌ No | ⚠️ Partial | ✅ Full |
| **Version Control** | ⚠️ Coupled | ⚠️ Coupled | ✅ Independent |
| **Team Separation** | ❌ No | ⚠️ Partial | ✅ Full |

---

## 💡 Strategic Recommendation

### **Phase 1 (Now - Q2 2025): Move to `packages/cas`**

**Why:**
1. Proper workspace = better dependency management
2. Easier to extract later
3. Can publish as npm package if needed
4. Clear separation from TutorWise tools
5. Still benefits from monorepo (shared testing, CI/CD)

**Migration Steps:**
```bash
# 1. Create new structure
mkdir -p packages/cas/{src,bin,config}

# 2. Move CAS code
mv tools/cas/* packages/cas/src/

# 3. Create package.json
cat > packages/cas/package.json << EOF
{
  "name": "@tutorwise/cas",
  "version": "2.0.0",
  "description": "Contextual Autonomous System - Universal DevOps Manager",
  "bin": {
    "cas": "./bin/cas"
  },
  "main": "./src/index.js",
  "dependencies": {
    "axios": "^1.6.0",
    "jira-client": "^8.0.0"
  }
}
EOF

# 4. Update imports
# Change: require('../tools/cas/...')
# To: require('@tutorwise/cas')

# 5. Update package.json workspaces (already includes packages/*)
```

---

### **Phase 2 (Q3-Q4 2025): Prepare for Extraction**

**As CAS matures, prepare for independence:**

1. **Reduce TutorWise coupling**
   - Generic interfaces, not TutorWise-specific
   - Plugin architecture
   - Configuration-driven

2. **Standalone testing**
   - CAS tests don't depend on TutorWise
   - Mock TutorWise integrations
   - Independent CI/CD pipeline

3. **Documentation**
   - CAS docs self-contained
   - No references to TutorWise internals
   - Public API documentation

---

### **Phase 3 (2026): Extract to Separate Repo**

**When ready for platform launch:**

```bash
# 1. Create new repo
gh repo create tutorwise/cas --public

# 2. Extract CAS history (preserve git history)
git subtree split --prefix=packages/cas -b cas-only
git push git@github.com:tutorwise/cas.git cas-only:main

# 3. TutorWise uses published package
npm install @cas/cli @cas/agent

# 4. Independent development
# CAS team works in cas repo
# TutorWise team works in tutorwise repo
```

---

## 🔄 Migration Plan

### Week 1-2: Restructure
- [ ] Move `tools/cas/` → `packages/cas/src/`
- [ ] Create `packages/cas/package.json`
- [ ] Add CLI entry point `packages/cas/bin/cas`
- [ ] Update imports across codebase
- [ ] Test all CAS commands still work

### Week 3-4: Cleanup
- [ ] Separate TutorWise tools from CAS tools
- [ ] Move TutorWise-specific scripts out of `tools/scripts/`
- [ ] Create clear README for each section
- [ ] Update documentation

### Week 5-6: Independence Prep
- [ ] Remove TutorWise-specific code from CAS
- [ ] Create generic interfaces
- [ ] Add configuration system
- [ ] Document public API

---

## 📁 Proposed Final Structure

### **Immediate (packages/cas):**

```
tutorwise/
├── apps/
│   ├── web/                    # TutorWise frontend
│   └── api/                    # TutorWise backend
├── packages/
│   ├── shared-types/           # TutorWise types
│   ├── ui/                     # TutorWise UI components
│   └── cas/                    # ← CAS package
│       ├── package.json
│       ├── bin/
│       │   └── cas
│       ├── src/
│       │   ├── agent/
│       │   ├── cli/
│       │   ├── core/
│       │   └── integrations/
│       ├── config/
│       ├── docs/
│       └── README.md
└── tools/
    ├── scripts/                # TutorWise-only scripts
    ├── playwright/             # TutorWise tests
    └── configs/                # Shared configs
```

### **Future (separate repo):**

```
cas/                            # github.com/tutorwise/cas
├── packages/
│   ├── core/
│   ├── agent/
│   ├── cli/
│   └── integrations/
├── apps/
│   └── dashboard/              # CAS SaaS platform
├── examples/
└── docs/

tutorwise/                      # github.com/tutorwise/tutorwise
├── apps/
├── packages/
└── package.json
    dependencies: {
      "@cas/cli": "^3.0.0"
    }
```

---

## ✅ Action Items

### Immediate (This Week):
1. **Move CAS to workspace**: `tools/cas/` → `packages/cas/`
2. **Add package.json**: Make CAS a proper package
3. **Update imports**: Use `@tutorwise/cas` everywhere
4. **Test**: Ensure `cas` command still works

### Short-term (This Month):
5. **Cleanup**: Separate TutorWise vs CAS code
6. **Documentation**: Update all references
7. **CI/CD**: Add CAS-specific testing pipeline

### Long-term (Q2-Q3 2025):
8. **Decouple**: Remove TutorWise dependencies from CAS
9. **Publish**: Test publishing CAS as npm package
10. **Extract**: Move to separate repo when ready for platform launch

---

## 🎯 Success Criteria

**Phase 1 Complete when:**
- ✅ CAS is in `packages/` workspace
- ✅ Has its own `package.json`
- ✅ All imports use `@tutorwise/cas`
- ✅ `cas` command works from anywhere
- ✅ Tests pass

**Ready for Extraction when:**
- ✅ Zero TutorWise-specific code in CAS
- ✅ Standalone documentation
- ✅ Independent CI/CD
- ✅ Published as npm package
- ✅ External users can use CAS

---

## 📝 Summary

**Current State:** CAS in `tools/` - works but not ideal for independence

**Recommendation:** Move to `packages/cas/` - best of both worlds

**Timeline:**
- **Now:** tools/cas (current)
- **Q2 2025:** packages/cas (workspace)
- **2026:** Separate repo (independent platform)

**Why this matters:**
CAS is destined to be an independent platform ($25M+ ARR vision).
Proper structure now makes extraction easier later.

---

**Version:** 1.0.0
**Last Updated:** 2025-10-04
**Decision Required:** Move CAS to packages/ or keep in tools/?
