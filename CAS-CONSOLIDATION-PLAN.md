# CAS Consolidation Plan

**Issue:** CAS files are scattered across `tools/cas/`, `cas/`, and `docs/`
**Goal:** Consolidate everything into root `cas/` directory
**Status:** Plan created, awaiting execution

---

## 🔍 Current State (Messy)

```
tutorwise/
├── cas/                              ← NEW structure (mostly empty)
│   ├── packages/
│   │   ├── agent/                    ← Empty stub
│   │   ├── cli/                      ← Empty stub
│   │   ├── core/                     ← Empty stub
│   │   └── sadd/                     ← ✅ Complete (SADD is here)
│   ├── config/                       ← Empty
│   ├── docs/                         ← Empty
│   └── package.json
│
├── tools/
│   ├── cas/                          ← 🔴 OLD CAS location (duplicate!)
│   │   ├── agent/                    ← Duplicate of cas/packages/agent/
│   │   ├── generate-context.js       ← Should be in cas/packages/core/
│   │   ├── jira-integration.js
│   │   ├── autonomous-ai-config.js
│   │   └── ...other scripts
│   │
│   ├── configs/                      ← 🔴 CAS configs (wrong location)
│   │   └── service-registry.json
│   │
│   ├── docs/                         ← 🔴 Some CAS docs
│   │   └── CAS-*.md
│   │
│   └── scripts/                      ← TutorWise + some CAS scripts mixed
│
└── docs/                             ← 🔴 More CAS docs scattered
    ├── CAS-ROADMAP.md
    ├── SADD-*.md
    └── ...
```

---

## 🎯 Target State (Clean)

```
tutorwise/
├── cas/                                      ← All CAS here
│   ├── packages/
│   │   ├── core/                             ← Core CAS functionality
│   │   │   ├── src/
│   │   │   │   ├── context/
│   │   │   │   │   └── generate-context.js   ← From tools/cas/
│   │   │   │   ├── service/
│   │   │   │   │   └── orchestration.js
│   │   │   │   └── integrations/
│   │   │   │       └── jira-integration.js   ← From tools/cas/
│   │   │   └── package.json
│   │   │
│   │   ├── agent/                            ← Autonomous agent
│   │   │   ├── src/                          ← From tools/cas/agent/
│   │   │   │   ├── integrations/
│   │   │   │   ├── workflows/
│   │   │   │   └── config/
│   │   │   └── package.json
│   │   │
│   │   ├── sadd/                             ← ✅ Already here
│   │   │   ├── bin/
│   │   │   ├── lib/
│   │   │   ├── config/
│   │   │   └── adaptations/
│   │   │
│   │   └── cli/                              ← Unified CLI
│   │       ├── src/
│   │       │   ├── commands/
│   │       │   │   ├── start.js
│   │       │   │   ├── stop.js
│   │       │   │   └── sadd.js
│   │       │   └── index.js
│   │       └── package.json
│   │
│   ├── config/                               ← All CAS config
│   │   ├── service-registry.json             ← From tools/configs/
│   │   ├── projects.json
│   │   └── cas-settings.json
│   │
│   ├── docs/                                 ← All CAS docs
│   │   ├── architecture/
│   │   │   └── CAS-ARCHITECTURE.md
│   │   ├── guides/
│   │   │   ├── CAS-ROADMAP.md                ← From docs/
│   │   │   └── GETTING-STARTED.md
│   │   └── sadd/
│   │       ├── SADD-GUIDE.md                 ← From docs/
│   │       └── SADD-PHASE-1-COMPLETE.md
│   │
│   ├── scripts/                              ← CAS utility scripts
│   │   ├── install-cas-global.sh
│   │   └── setup/
│   │
│   ├── package.json                          ← Root CAS package
│   └── README.md                             ← CAS overview
│
└── tools/                                    ← TutorWise-specific ONLY
    ├── scripts/                              ← TutorWise scripts
    │   ├── deployment/
    │   ├── setup/
    │   └── monitoring/
    │
    ├── integrations/                         ← TutorWise integrations
    │   ├── confluence-sync.js
    │   └── sync-google-docs.js
    │
    └── configs/                              ← TutorWise configs
        └── tutorwise-specific-config.json
```

---

## 📋 Migration Steps

### Step 1: Move `tools/cas/` → `cas/packages/core/`

**What:**
- Move all scripts from `tools/cas/` to `cas/packages/core/src/`
- Exclude `agent/` folder (handle separately)

**Commands:**
```bash
# Create structure
mkdir -p cas/packages/core/src/{context,service,integrations,utils}

# Move scripts
mv tools/cas/generate-context.js cas/packages/core/src/context/
mv tools/cas/jira-integration.js cas/packages/core/src/integrations/
mv tools/cas/autonomous-ai-config.js cas/packages/core/src/config/
mv tools/cas/setup-context-engineering.js cas/packages/core/src/context/
mv tools/cas/migrate-to-monorepo.js cas/packages/core/src/utils/
mv tools/cas/update-imports.js cas/packages/core/src/utils/

# Create package.json
cat > cas/packages/core/package.json <<EOF
{
  "name": "@cas/core",
  "version": "2.0.0",
  "description": "CAS Core - Service orchestration and management",
  "main": "src/index.js"
}
EOF
```

---

### Step 2: Consolidate `agent/` folders

**Issue:** Two agent folders exist:
- `tools/cas/agent/` (has actual code)
- `cas/packages/agent/` (empty stub)

**Solution:** Move `tools/cas/agent/` → `cas/packages/agent/`

**Commands:**
```bash
# Remove empty stub
rm -rf cas/packages/agent/

# Move real agent folder
mv tools/cas/agent/ cas/packages/agent/

# Ensure package.json exists
cat > cas/packages/agent/package.json <<EOF
{
  "name": "@cas/agent",
  "version": "1.0.0",
  "description": "CAS Autonomous Agent",
  "dependencies": {
    "@cas/core": "^2.0.0"
  }
}
EOF
```

---

### Step 3: Move `tools/configs/` → `cas/config/`

**What:**
- Move CAS configuration files

**Commands:**
```bash
# Move service registry
mv tools/configs/service-registry.json cas/config/

# Keep TutorWise-specific configs in tools/configs/
# (if any exist)
```

---

### Step 4: Move CAS docs to `cas/docs/`

**What:**
- Consolidate all CAS documentation

**Commands:**
```bash
# Create doc structure
mkdir -p cas/docs/{architecture,guides,sadd}

# Move CAS docs from root docs/
mv docs/CAS-ROADMAP.md cas/docs/guides/
mv docs/CAS-IMPLEMENTATION-TRACKER.md cas/docs/guides/

# Move SADD docs
mv docs/SADD-*.md cas/docs/sadd/

# Move any docs from tools/docs/
mv tools/docs/CAS-*.md cas/docs/ 2>/dev/null || true
```

---

### Step 5: Clean up `tools/cas/`

**What:**
- Remove now-empty `tools/cas/` directory

**Commands:**
```bash
# After all moves complete
rm -rf tools/cas/
```

---

### Step 6: Update import paths

**What:**
- Update any scripts that reference old paths

**Files to update:**
- `package.json` scripts
- `tools/scripts/setup/cas-startup.sh`
- Any scripts importing from `tools/cas/`

**Find references:**
```bash
grep -r "tools/cas" . --include="*.js" --include="*.sh" --include="*.json"
```

---

## ✅ Verification Checklist

After migration:

- [ ] `tools/cas/` no longer exists
- [ ] All CAS scripts in `cas/packages/core/src/`
- [ ] Agent code in `cas/packages/agent/`
- [ ] SADD in `cas/packages/sadd/` (already correct)
- [ ] CAS configs in `cas/config/`
- [ ] CAS docs in `cas/docs/`
- [ ] Only TutorWise-specific code remains in `tools/`
- [ ] All import paths updated
- [ ] npm scripts work correctly
- [ ] CAS startup script works

---

## 🎯 Benefits

**After consolidation:**
1. ✅ **Clear separation:** CAS vs TutorWise code
2. ✅ **Easy extraction:** CAS can be lifted out cleanly
3. ✅ **Better navigation:** Everything CAS in one place
4. ✅ **Proper structure:** Follows package-based architecture
5. ✅ **Scalable:** Easy to add new CAS packages

---

## 📊 Summary

| Item | Before | After |
|------|--------|-------|
| **CAS location** | Scattered (3+ locations) | `cas/` only |
| **Agent** | 2 copies | 1 copy in `cas/packages/agent/` |
| **Configs** | `tools/configs/` | `cas/config/` |
| **Docs** | `docs/` and `tools/docs/` | `cas/docs/` |
| **Scripts** | `tools/cas/` | `cas/packages/core/src/` |
| **SADD** | ✅ Already in `cas/packages/sadd/` | ✅ No change needed |

---

## 🚀 Execute Plan?

**Ready to execute:** Yes
**Estimated time:** 15 minutes
**Risk level:** Low (mostly moving files)
**Reversible:** Yes (git can undo)

**Next step:** Execute migration steps 1-6

---

**Status:** Plan complete - awaiting approval to execute
**Created:** 2025-10-05
