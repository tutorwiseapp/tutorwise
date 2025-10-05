# ROLLBACK INSTRUCTIONS - Middleware Migration

## If anything goes wrong, run these commands:

### Option 1: Git Revert (Recommended)
```bash
git revert HEAD --no-commit
git commit -m "Rollback: Restore middleware to root directory"
git push origin main
```

### Option 2: Manual Restore from Backup
```bash
# Restore old middleware to apps/web/src/
cp .backup/middleware-migration-20251005-174356/middleware-web-src-OLDER.ts apps/web/src/middleware.ts

# Restore newer middleware to root
cp .backup/middleware-migration-20251005-174356/middleware-root-NEWER.ts middleware.ts

# Commit the rollback
git add middleware.ts apps/web/src/middleware.ts
git commit -m "Rollback: Restore middleware files to previous state"
git push origin main
```

### Option 3: Cherry-pick from Previous Commit
```bash
# Get the commit hash before this change
git log --oneline -5

# Cherry-pick the previous working state
git cherry-pick <previous-commit-hash>
git push origin main
```

## Backup Location
`.backup/middleware-migration-20251005-174356/`
- middleware-root-NEWER.ts (the version we moved to apps/web/src/)
- middleware-web-src-OLDER.ts (the old version that was replaced)

## Test After Rollback
```bash
npm run build
npm run test:unit:quick
```

