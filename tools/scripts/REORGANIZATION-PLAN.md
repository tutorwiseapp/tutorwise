# Tools/Scripts Reorganization Plan

## Current Issues
- All documentation files mixed with scripts in root
- No clear separation between docs, deployment scripts, and utilities
- Difficult to find specific files
- No clear categorization

## Proposed Structure

```
tools/
├── scripts/
│   ├── deployment/              # Deployment scripts
│   │   ├── railway-deploy.sh
│   │   ├── vercel-deploy.sh
│   │   └── README.md
│   │
│   ├── database/                # Database management
│   │   ├── neo4j-test-connection.sh
│   │   ├── redis-test-connection.sh
│   │   ├── supabase-db-management.sh
│   │   └── README.md
│   │
│   ├── testing/                 # Testing scripts (already exists)
│   │   ├── test-role-management.js
│   │   ├── test-jira-fields.js
│   │   └── ...
│   │
│   ├── integrations/            # Integration scripts (already exists)
│   │   ├── confluence-sync.js
│   │   ├── google-docs-sync.js
│   │   └── ...
│   │
│   ├── utilities/               # Utility scripts (already exists)
│   │   ├── test-integrations.js
│   │   ├── screenshot.js
│   │   └── ...
│   │
│   ├── automation/              # Automation & background tasks (already exists)
│   │   ├── jira-task-executor.js
│   │   └── calendar-task-executor.js
│   │
│   ├── monitoring/              # Monitoring & health checks
│   │   ├── health-check.sh
│   │   ├── project-audit.sh
│   │   ├── run-daily-audit.sh
│   │   └── README.md
│   │
│   ├── setup/                   # Setup & initialization
│   │   ├── cas-startup.sh
│   │   ├── claude-code-login.sh
│   │   ├── setup-aliases.sh
│   │   └── README.md
│   │
│   └── security/                # Security & secrets management
│       ├── google-secret-manager-setup.sh
│       ├── migrate-secrets-to-gcp.sh
│       ├── run-protection-report.sh
│       └── README.md
│
├── docs/
│   ├── setup/                   # Setup guides
│   │   ├── cloud-services/
│   │   │   ├── railway.md
│   │   │   ├── vercel.md
│   │   │   ├── supabase.md
│   │   │   ├── stripe.md
│   │   │   └── overview.md
│   │   │
│   │   ├── databases/
│   │   │   ├── neo4j.md
│   │   │   ├── redis.md
│   │   │   └── overview.md
│   │   │
│   │   └── README.md
│   │
│   ├── usage/                   # Usage guides
│   │   ├── cas-startup.md
│   │   ├── aliases.md
│   │   ├── commands.md
│   │   └── README.md
│   │
│   └── README.md
│
└── configs/                     # Configuration files
    ├── service-registry.json
    ├── redis.conf
    └── README.md
```

## Migration Steps

### Phase 1: Create New Directory Structure
```bash
mkdir -p tools/scripts/{deployment,database,monitoring,setup,security}
mkdir -p tools/docs/{setup/{cloud-services,databases},usage}
```

### Phase 2: Move Documentation
```bash
# Cloud services docs
mv tools/scripts/RAILWAY-AUTH-README.md tools/docs/setup/cloud-services/railway.md
mv tools/scripts/VERCEL-AUTH-README.md tools/docs/setup/cloud-services/vercel.md
mv tools/scripts/SUPABASE-AUTH-README.md tools/docs/setup/cloud-services/supabase.md
mv tools/scripts/STRIPE-AUTH-README.md tools/docs/setup/cloud-services/stripe.md
mv tools/scripts/CLOUD-SERVICES-SETUP.md tools/docs/setup/cloud-services/overview.md

# Database docs
mv tools/scripts/NEO4J-SETUP-README.md tools/docs/setup/databases/neo4j.md
mv tools/scripts/REDIS-SETUP-README.md tools/docs/setup/databases/redis.md

# Usage docs
mv tools/scripts/STARTUP-UTILITY-README.md tools/docs/usage/cas-startup.md
mv tools/scripts/ALIAS-SETUP-README.md tools/docs/usage/aliases.md
mv tools/scripts/COMMAND-REFERENCE.md tools/docs/usage/commands.md
```

### Phase 3: Move Scripts by Category
```bash
# Deployment scripts
mv tools/scripts/railway-deploy.sh tools/scripts/deployment/
mv tools/scripts/vercel-deploy.sh tools/scripts/deployment/

# Database scripts
mv tools/scripts/neo4j-test-connection.sh tools/scripts/database/
mv tools/scripts/redis-test-connection.sh tools/scripts/database/
mv tools/scripts/supabase-db-management.sh tools/scripts/database/

# Monitoring scripts
mv tools/scripts/health-check.sh tools/scripts/monitoring/
mv tools/scripts/project-audit.sh tools/scripts/monitoring/
mv tools/scripts/run-daily-audit.sh tools/scripts/monitoring/

# Setup scripts
mv tools/scripts/cas-startup.sh tools/scripts/setup/
mv tools/scripts/claude-code-login.sh tools/scripts/setup/
mv tools/scripts/setup-aliases.sh tools/scripts/setup/

# Security scripts
mv tools/scripts/google-secret-manager-setup.sh tools/scripts/security/
mv tools/scripts/migrate-secrets-to-gcp.sh tools/scripts/security/
mv tools/scripts/run-protection-report.sh tools/scripts/security/
```

### Phase 4: Update References
- Update package.json script paths
- Update documentation links
- Update service-registry.json paths
- Update import/require statements

### Phase 5: Create Index READMEs
- Create README.md in each category folder
- Create main tools/docs/README.md with navigation
- Update QUICK-START.md with new paths

## Benefits
1. ✅ Clear separation of concerns
2. ✅ Easy to find files by category
3. ✅ Better documentation organization
4. ✅ Scalable structure for future additions
5. ✅ Cleaner root directory
6. ✅ Easier onboarding for new developers

## Backward Compatibility
- Keep symlinks in original locations for transition period
- Add deprecation notices
- Update all internal references first
