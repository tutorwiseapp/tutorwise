# TutorWise Tools Directory Structure

## Current Organization

```
tools/
├── scripts/
│   ├── deployment/              📦 Deployment Scripts
│   │   ├── railway-deploy.sh
│   │   └── vercel-deploy.sh
│   │
│   ├── database/                💾 Database Management
│   │   ├── neo4j-test-connection.sh
│   │   ├── redis-test-connection.sh
│   │   ├── supabase-db-management.sh
│   │   └── terraform-test-connection.sh
│   │
│   ├── monitoring/              📊 Health & Monitoring
│   │   ├── health-check.sh
│   │   ├── project-audit.sh
│   │   └── run-daily-audit.sh
│   │
│   ├── setup/                   ⚙️ Setup & Initialization
│   │   ├── cas-startup.sh
│   │   ├── claude-code-login.sh
│   │   └── setup-aliases.sh
│   │
│   ├── security/                🔐 Security & Secrets
│   │   ├── google-secret-manager-setup.sh
│   │   ├── migrate-secrets-to-gcp.sh
│   │   └── run-protection-report.sh
│   │
│   ├── testing/                 🧪 Test Scripts
│   │   ├── test-role-management.js
│   │   ├── test-jira-fields.js
│   │   └── ...
│   │
│   ├── integrations/            🔌 Third-Party Integrations
│   │   ├── confluence-sync.js
│   │   ├── google-docs-sync.js
│   │   ├── fetch-figma-design.js
│   │   └── ...
│   │
│   ├── utilities/               🛠️ Helper Utilities
│   │   ├── test-integrations.js
│   │   ├── screenshot.js
│   │   └── ...
│   │
│   └── automation/              🤖 Background Tasks
│       ├── jira-task-executor.js
│       └── calendar-task-executor.js
│
├── docs/                        📚 Documentation
│   ├── README.md                (Master index)
│   │
│   ├── setup/                   Setup Guides
│   │   ├── cloud-services/
│   │   │   ├── overview.md      (All services)
│   │   │   ├── railway.md       (Backend deployment)
│   │   │   ├── vercel.md        (Frontend deployment)
│   │   │   ├── supabase.md      (Database & auth)
│   │   │   └── stripe.md        (Payments)
│   │   │
│   │   └── databases/
│   │       ├── neo4j.md         (Graph database)
│   │       └── redis.md         (Cache)
│   │
│   └── usage/                   Usage Guides
│       ├── cas-startup.md       (Service manager)
│       ├── aliases.md           (Command shortcuts)
│       └── commands.md          (All commands)
│
└── configs/                     ⚙️ Configuration Files
    ├── service-registry.json
    └── redis.conf
```

## Quick Navigation

### By Task

| I need to... | Go to... |
|--------------|----------|
| **Deploy to cloud** | `scripts/deployment/` |
| **Manage databases** | `scripts/database/` |
| **Check system health** | `scripts/monitoring/` |
| **Setup development** | `scripts/setup/` |
| **Manage secrets** | `scripts/security/` |
| **Run tests** | `scripts/testing/` |
| **Sync integrations** | `scripts/integrations/` |
| **Use utilities** | `scripts/utilities/` |
| **Background tasks** | `scripts/automation/` |

### By Service

| Service | Documentation | Scripts |
|---------|--------------|---------|
| **Railway** | `docs/setup/cloud-services/railway.md` | `scripts/deployment/railway-deploy.sh` |
| **Vercel** | `docs/setup/cloud-services/vercel.md` | `scripts/deployment/vercel-deploy.sh` |
| **Neo4j** | `docs/setup/databases/neo4j.md` | `scripts/database/neo4j-test-connection.sh` |
| **Redis** | `docs/setup/databases/redis.md` | `scripts/database/redis-test-connection.sh` |
| **Supabase** | `docs/setup/cloud-services/supabase.md` | `scripts/database/supabase-db-management.sh` |
| **Stripe** | `docs/setup/cloud-services/stripe.md` | - |

## File Count by Category

```
deployment/      2 scripts
database/        4 scripts
monitoring/      3 scripts
setup/           3 scripts
security/        3 scripts
testing/         ~15 scripts
integrations/    ~10 scripts
utilities/       ~10 scripts
automation/      2 scripts
───────────────────────────
Total:          ~52 scripts

cloud-services/  5 docs
databases/       2 docs
usage/           3 docs
───────────────────────────
Total:          10 docs
```

## Benefits

✅ **Organized** - Clear categorization by purpose
✅ **Scalable** - Easy to add new scripts
✅ **Discoverable** - Logical folder names
✅ **Maintainable** - Related files together
✅ **Professional** - Industry standard structure

## Migration Status

- ✅ Directory structure created
- ✅ Files copied to new locations
- ✅ package.json paths updated
- ✅ service-registry.json updated
- ✅ Documentation links updated
- ✅ Master index created
- ✅ All scripts tested and working
- ⏳ Original files cleanup (pending)

---

**See Also:**
- [Reorganization Summary](./REORGANIZATION-SUMMARY.md)
- [Documentation Index](./docs/README.md)
- [Quick Start Guide](../QUICK-START.md)
