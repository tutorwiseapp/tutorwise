# CAS Documentation Naming Conventions

**Date**: 2025-10-31
**Status**: Active Standard

---

## File Naming Standard

All CAS documentation files should use **lowercase-kebab-case.md**

### Examples

✅ **Correct**:
- `quick-start-guide.md`
- `session-template.md`
- `hybrid-mode-setup.md`
- `feature-development-checklist.md`
- `proven-patterns.md`
- `design-system.md`

❌ **Incorrect**:
- `QUICK-START.md` (uppercase)
- `SESSION_TEMPLATE.md` (underscore)
- `QuickStart.md` (PascalCase)
- `quickStart.md` (camelCase)

---

## Why lowercase-kebab-case?

1. **Web-friendly**: URLs are case-insensitive, lowercase prevents confusion
2. **Readable**: Hyphens are more readable than underscores or no separators
3. **Universal**: Works across all operating systems (no case-sensitivity issues)
4. **Modern convention**: Used by most modern frameworks (Next.js, Nuxt, etc.)
5. **Git-friendly**: Avoids case-change commit issues on macOS/Windows

---

## Migration Plan

### Phase 1: New Files (Complete ✅)
All new documentation uses lowercase-kebab-case:
- ✅ `quick-start-guide.md`
- ✅ `session-template.md`
- ✅ `hybrid-mode-setup.md`
- ✅ `cas-hybrid-mode-complete.md` (in root)

### Phase 2: High-Traffic Files (Optional)
Rename frequently accessed docs:
- `PROVEN_patterns.md` → `proven-patterns.md`
- `DESIGN_SYSTEM.md` → `design-system.md`
- `ENHANCED-CAS-AI-PRODUCT-TEAM.md` → `enhanced-cas-ai-product-team.md`
- `FEATURE-DEVELOPMENT-CHECKLIST.md` → `feature-development-checklist.md`

### Phase 3: All Legacy Files (Future)
Gradually rename all remaining files as they're updated.

---

## Special Cases

### README.md
- Always `README.md` (uppercase by convention)
- Recognized by GitHub, GitLab, etc.

### Agent READMEs
- Keep as `README.md` in agent directories
- Example: `agents/developer/README.md`

### Process Documentation
- Currently in `process/` directory with UPPER-KEBAB-CASE
- Migrate to lowercase-kebab-case over time:
  - `AI-THREE-AMIGOS-KICK-OFF.md` → `ai-three-amigos-kick-off.md`
  - `SECRET-MANAGEMENT-WORKFLOW.md` → `secret-management-workflow.md`

---

## Directory Structure

```
cas/
├── README.md                              # Exception: uppercase
├── quick-start-guide.md                   # New standard
├── session-template.md                    # New standard
├── hybrid-mode-setup.md                   # New standard
├── docs/
│   ├── README.md                         # Exception: uppercase
│   ├── proven-patterns.md                # To be renamed
│   ├── design-system.md                  # To be renamed
│   ├── enhanced-cas-ai-product-team.md   # To be renamed
│   ├── feature-development-checklist.md  # To be renamed
│   └── naming-conventions.md             # This file
├── process/
│   ├── ai-three-amigos-kick-off.md       # To be renamed
│   ├── secret-management-workflow.md     # To be renamed
│   └── ...
└── agents/
    ├── developer/
    │   ├── README.md                     # Exception: uppercase
    │   └── planning/
    │       └── cas-feature-dev-plan.md   # Already correct
    └── ...
```

---

## Implementation Checklist

### Immediate (Complete ✅)
- [x] Rename `QUICK-START.md` → `quick-start-guide.md`
- [x] Rename `SESSION-TEMPLATE.md` → `session-template.md`
- [x] Rename `HYBRID-MODE-SETUP.md` → `hybrid-mode-setup.md`
- [x] Rename `CAS-HYBRID-MODE-COMPLETE.md` → `cas-hybrid-mode-complete.md`
- [x] Update references in package.json
- [x] Create this naming conventions document

### Next Session (Optional)
- [ ] Rename `PROVEN_patterns.md` → `proven-patterns.md`
- [ ] Rename `DESIGN_SYSTEM.md` → `design-system.md`
- [ ] Rename `ENHANCED-CAS-AI-PRODUCT-TEAM.md` → `enhanced-cas-ai-product-team.md`
- [ ] Rename `FEATURE-DEVELOPMENT-CHECKLIST.md` → `feature-development-checklist.md`
- [ ] Update all internal references

### Future (As Updated)
- [ ] Migrate all process/ docs to lowercase-kebab-case
- [ ] Migrate all remaining docs/ files
- [ ] Update all README references

---

## Updating References

When renaming files, update references in:

1. **package.json scripts**:
   ```json
   "cas:help": "cat quick-start-guide.md"
   ```

2. **Markdown links**:
   ```markdown
   See [Quick Start Guide](quick-start-guide.md)
   ```

3. **Script paths**:
   ```bash
   cat cas/quick-start-guide.md
   ```

4. **README files**:
   Update all links to renamed files

---

## Why Not Rename Everything Now?

**Reasons to migrate gradually**:

1. **Link Breakage**: External links to GitHub files will break
2. **Git History**: Renaming loses blame/history (can fix with `git log --follow`)
3. **Low Priority**: Naming inconsistency doesn't affect functionality
4. **Time**: 50+ files to rename + update all references = 2-3 hours

**Better approach**: Rename as files are updated naturally

---

## Enforcement

### For New Files
- All new documentation MUST use lowercase-kebab-case
- No exceptions (except README.md)

### For Updated Files
- When significantly updating a file, rename it at the same time
- Update all references in same commit

### For Legacy Files
- Leave as-is unless being updated
- No rush to rename everything

---

## Summary

**Standard**: `lowercase-kebab-case.md` for all CAS documentation

**Exceptions**: `README.md` (uppercase by convention)

**Migration**: Gradual, as files are updated

**Status**: New files already compliant ✅

---

**Questions?** See [quick-start-guide.md](../quick-start-guide.md) or [hybrid-mode-setup.md](../hybrid-mode-setup.md)
