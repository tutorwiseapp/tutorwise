# TutorWise Documentation

Complete documentation for TutorWise setup, configuration, and usage.

## 📚 Documentation Structure

### Setup Guides

#### Cloud Services
- **[Overview](./setup/cloud-services/overview.md)** - Complete cloud services setup guide
- **[Railway](./setup/cloud-services/railway.md)** - Backend deployment (Account vs Project Tokens)
- **[Vercel](./setup/cloud-services/vercel.md)** - Frontend deployment (User vs Project Tokens)
- **[Supabase](./setup/cloud-services/supabase.md)** - Database & Auth (Anon vs Service Role)
- **[Stripe](./setup/cloud-services/stripe.md)** - Payment processing (Publishable vs Secret Keys)

#### Databases
- **[Neo4j](./setup/databases/neo4j.md)** - Graph database setup & configuration
- **[Redis](./setup/databases/redis.md)** - Cache & session storage setup

### Usage Guides
- **[CAS Startup Utility](./usage/cas-startup.md)** - Service orchestration and management
- **[Shell Aliases](./usage/aliases.md)** - Command shortcuts setup
- **[Command Reference](./usage/commands.md)** - All available command methods

## 🚀 Quick Start

### First Time Setup
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Start local databases
docker-compose up neo4j redis -d

# 3. Initialize environment
npm run claude:login

# 4. Set up shell aliases (optional)
npm run setup-aliases
```

### Daily Development
```bash
# Start all services
npm run cas-startup

# Or use alias (if set up)
cas-startup
```

### Deployment
```bash
# Deploy backend to Railway
npm run deploy:railway

# Deploy frontend to Vercel (production)
npm run deploy:vercel:prod
```

## 🔑 Authentication Quick Reference

| Service | Frontend Key | Backend Key | Documentation |
|---------|-------------|-------------|---------------|
| **Railway** | N/A | Account Token | [Guide](./setup/cloud-services/railway.md) |
| **Vercel** | N/A | User Access Token | [Guide](./setup/cloud-services/vercel.md) |
| **Supabase** | Anon Key ✅ | Service Role ❌ | [Guide](./setup/cloud-services/supabase.md) |
| **Stripe** | Publishable ✅ | Secret ❌ | [Guide](./setup/cloud-services/stripe.md) |
| **Neo4j** | N/A | Password | [Guide](./setup/databases/neo4j.md) |
| **Redis** | N/A | Password | [Guide](./setup/databases/redis.md) |

✅ = Safe to expose
❌ = Keep secret (backend only)

## 📂 Related Documentation

- **[QUICK-START.md](/QUICK-START.md)** - Quick start guide at project root
- **[.env.example](/.env.example)** - Environment variable template
- **[docker-compose.yml](/docker-compose.yml)** - Docker services configuration

## 🛠️ Scripts Reference

All scripts are organized by category in `tools/scripts/`:

- **deployment/** - Railway & Vercel deployment scripts
- **database/** - Database connection & management scripts
- **monitoring/** - Health checks & project audits
- **setup/** - CAS startup, login, & alias setup
- **security/** - Secret management scripts
- **testing/** - Test scripts
- **integrations/** - Third-party integration scripts
- **utilities/** - Helper utilities
- **automation/** - Background task scripts

## 📖 Getting Help

### By Topic

**Cloud Deployment Issues:**
- Railway: See [Railway Authentication Guide](./setup/cloud-services/railway.md#common-issues--solutions)
- Vercel: See [Vercel Authentication Guide](./setup/cloud-services/vercel.md#common-issues--solutions)

**Database Issues:**
- Neo4j: See [Neo4j Setup Guide](./setup/databases/neo4j.md#common-issues--solutions)
- Redis: See [Redis Setup Guide](./setup/databases/redis.md#common-issues--solutions)

**Payment Issues:**
- Stripe: See [Stripe Authentication Guide](./setup/cloud-services/stripe.md#common-issues--solutions)

**Service Management:**
- CAS Startup: See [CAS Startup Guide](./usage/cas-startup.md#troubleshooting)

### Support Channels

1. **Documentation** - Check relevant guide above
2. **QUICK-START.md** - Common workflows and troubleshooting
3. **GitHub Issues** - Report bugs or request features
4. **Team Chat** - Ask questions in Slack/Discord

## 🔄 Keeping Documentation Updated

When making changes:
1. Update relevant documentation files
2. Test all commands and scripts
3. Update screenshots if UI changed
4. Add migration notes if breaking changes
5. Update this index if adding new docs

## ✨ Contributing

To add or update documentation:
1. Follow the existing structure
2. Use clear, concise language
3. Include code examples
4. Add troubleshooting sections
5. Cross-reference related docs
6. Keep table of contents updated

---

**Last Updated:** 2025-01-04
**Maintained By:** TutorWise Engineering Team
