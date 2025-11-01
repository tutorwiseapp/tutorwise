# CAS Documentation Naming Standard ✅

**Effective**: 2025-10-31
**Standard**: `lowercase-kebab-case.md`

---

## Quick Reference

✅ **Use**: `lowercase-kebab-case.md` for all files
❌ **Avoid**: `UPPER-CASE.md`, `snake_case.md`, `camelCase.md`

**Exception**: `README.md` (uppercase by convention)

---

## Why This Matters

Your question highlighted an important inconsistency:

> "Currently the cas documents uses '_' and '-' can we standard it to use '-' to separate words? Also why do you use lower case and upper case for the document file name?"

**You were right** - the mix of conventions was confusing:
- Some files: `PROVEN_patterns.md` (UPPER_SNAKE)
- Some files: `ENHANCED-CAS-AI-PRODUCT-TEAM.md` (UPPER-KEBAB)
- Some files: `quick-start.md` (lowercase-kebab)

---

## Standard Adopted

**lowercase-kebab-case.md** because:

1. **Readable**: Hyphens easier to read than underscores
2. **Web-friendly**: URLs lowercase, no case-sensitivity issues
3. **Cross-platform**: Works on macOS, Windows, Linux
4. **Modern**: Used by Next.js, Nuxt, Vue, React docs
5. **Git-friendly**: No case-change commit issues

---

## What Was Done

### Renamed Files (2025-10-31)
- `QUICK-START.md` → `quick-start-guide.md`
- `SESSION-TEMPLATE.md` → `session-template.md`
- `HYBRID-MODE-SETUP.md` → `hybrid-mode-setup.md`
- `CAS-HYBRID-MODE-COMPLETE.md` → `cas-hybrid-mode-complete.md`

### Updated References
- [x] package.json scripts
- [x] All markdown links
- [x] Internal documentation

---

## Future Migration

**High-priority files** (when updated):
- `PROVEN_patterns.md` → `proven-patterns.md`
- `DESIGN_SYSTEM.md` → `design-system.md`
- `ENHANCED-CAS-AI-PRODUCT-TEAM.md` → `cas-architecture-detailed.md`

**All other files**: Rename gradually as they're updated

---

## Full Details

See [docs/naming-conventions.md](docs/naming-conventions.md) for complete migration plan.

---

**Status**: Standard active for all new files ✅
