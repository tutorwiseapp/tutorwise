# CAS Application Registry

**Registry Location:** `cas/config/application-registry.json`  
**Purpose:** Track all applications managed by CAS/SADD  
**Created:** 2025-10-05

---

## 📋 What Is This?

The **Application Registry** is a central database that tracks every application/project managed by CAS (Contextual Autonomous System) and SADD (Software Application Discovery and Development).

### Why It Exists:

1. **Visibility** - See all connected apps in one place
2. **Management** - Track which apps are sources vs targets
3. **Deployment History** - Know what's been deployed where
4. **Tech Stack Mapping** - Understand compatibility
5. **Service Inventory** - See which CAS/SADD services each app uses

---

## 🎯 Registry Structure

### Application Types:

| Type | Role | Description |
|------|------|-------------|
| **Primary** | Source | Main development platform - exports features |
| **Satellite** | Target | Receives features from primary apps |

### Application Roles:

| Role | Description | Example |
|------|-------------|---------|
| **source** | Exports features to other apps | TutorWise |
| **target** | Imports features from other apps | Vinite |
| **hybrid** | Both source and target | (future apps) |

---

## 📊 Current Registry

### Applications Managed:

#### 1. **TutorWise** (Primary/Source)
- **Type:** Primary development platform
- **Role:** Source (exports features)
- **Path:** `/Users/michaelquan/projects/tutorwise`
- **Framework:** Next.js 14 + FastAPI
- **Status:** Active
- **Tech Stack:**
  - Frontend: Next.js 14
  - Backend: FastAPI
  - Databases: Supabase, Neo4j, Redis
  - Payments: Stripe
  - Deployment: Vercel + Railway

**Managed Services:**
- ✅ CAS (Service Orchestration)
- ✅ SADD (Feature Migration)
- ✅ Context Generation
- ✅ Service Orchestration

**Features Available for Export:**
1. ui-components
2. supabase-auth
3. stripe-payments
4. role-based-dashboard
5. profile-management

---

#### 2. **Vinite** (Satellite/Target)
- **Type:** Satellite platform
- **Role:** Target (imports features)
- **Path:** `/Users/michaelquan/projects/vinite`
- **Framework:** Next.js 14
- **Status:** Active
- **Description:** Universal referral platform (RATA - Refer Anything To Anyone)
- **Tech Stack:**
  - Frontend: Next.js 14
  - Database: Supabase
  - Payments: Stripe
  - Deployment: Vercel

**Managed Services:**
- ✅ SADD (Feature Migration)
- ✅ SADD Remote Agent

**Features Imported:**
1. ui-components v1.2.0 (pending merge)

**Role Mapping:**
- `tutor` → `provider`
- `client` → `seeker`
- `agent` → `agent` (unchanged)

**Deployment Info:**
- URL: https://vinite.com
- Vercel Project: vinite
- Supabase Project: vinite-production

---

## 🔧 How to View Registry

### Command Line:
```bash
# View full registry
npm run cas:apps

# Or directly
bash cas/packages/sadd/bin/sadd-apps
```

### Expected Output:
```
╔════════════════════════════════════════════════════════════════════╗
║           CAS/SADD Application Registry                           ║
║           Software Application Discovery & Development             ║
╚════════════════════════════════════════════════════════════════════╝

📊 Summary:
  Total Applications: 2
  Active: 2 | Source: 1 | Target: 1
  Total Deployments: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 TutorWise (source)
   Type: primary
   Status: ● ACTIVE
   Description: Tutor marketplace platform - primary source for features
   Path: /Users/michaelquan/projects/tutorwise
   Framework: next.js
   Features Available: 5 features ready for export
   Features:
     • ui-components
     • supabase-auth
     • stripe-payments
     • role-based-dashboard
     • profile-management
   Managed Services:
     ✓ CAS (Service Orchestration)
     ✓ SADD (Feature Migration)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛰️ Vinite (target)
   Type: satellite
   Status: ● ACTIVE
   Description: Universal referral platform (RATA - Refer Anything To Anyone)
   Path: /Users/michaelquan/projects/vinite
   Framework: next.js
   Features Imported: 1 features deployed
   Imported Features:
     • ui-components v1.2.0 (pending_merge)
   Managed Services:
     ✓ SADD (Feature Migration)
     ✓ SADD Remote Agent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📈 Registry Statistics

| Metric | Value |
|--------|-------|
| Total Applications | 2 |
| Active Applications | 2 |
| Source Applications | 1 (TutorWise) |
| Target Applications | 1 (Vinite) |
| Total Deployments | 1 |
| Pending Deployments | 1 |

---

## 🔗 Related Registries

CAS maintains multiple registries for different purposes:

| Registry | Purpose | Location |
|----------|---------|----------|
| **Application Registry** | Track all apps | `cas/config/application-registry.json` |
| **Service Registry** | Track services (DB, API, etc) | `cas/config/service-registry.json` |
| **Feature Catalog** | Available features | `cas/packages/sadd/config/sadd-feature-catalog.json` |

---

## 🎯 Use Cases

### 1. See All Managed Apps
```bash
npm run cas:apps
```

### 2. Check What Features Are Available
```bash
cat cas/packages/sadd/config/sadd-feature-catalog.json | jq '.features | keys'
```

### 3. See Where Features Are Deployed
```bash
npm run cas:apps
# Look at "Imported Features" section for each target app
```

### 4. Find App Paths
```bash
cat cas/config/application-registry.json | jq '.applications.vinite.path'
```

### 5. Check Tech Stack Compatibility
```bash
cat cas/config/application-registry.json | jq '.applications[].tech_stack'
```

---

## 🔄 Future Applications

As you add more apps to the CAS/SADD ecosystem, they should be added to this registry:

### Potential Future Apps:
- **TutorWise Admin** (dashboard for admins)
- **TutorWise Mobile** (React Native app)
- **Vinite API** (standalone API service)
- **Other Platforms** (any app that wants to share features)

### To Add New App:
1. Edit `cas/config/application-registry.json`
2. Add new entry under `applications`
3. Update `stats` section
4. Deploy SADD Remote Agent to target apps
5. Run `npm run cas:apps` to verify

---

## 📝 Schema

Each application entry includes:

```json
{
  "app-name": {
    "name": "Display Name",
    "type": "primary|satellite",
    "description": "What this app does",
    "path": "/absolute/path/to/app",
    "git_remote": "git@github.com:org/repo.git",
    "status": "active|inactive",
    "framework": "next.js|react|etc",
    "language": "typescript|javascript|etc",
    "role": "source|target|hybrid",
    "tech_stack": { ... },
    "managed_services": { ... },
    "sadd_role": "source|target",
    "features_exported": [],      // for source apps
    "features_imported": [],      // for target apps
    "deployment_info": { ... },   // optional
    "role_mapping": { ... },      // optional
    "created_at": "2025-10-05",
    "notes": "Additional info"
  }
}
```

---

## 💡 Benefits

1. **Single Source of Truth** - Know exactly what apps are managed
2. **Deployment Tracking** - See what's deployed where
3. **Tech Stack Visibility** - Understand compatibility
4. **Service Inventory** - Know which services each app uses
5. **Audit Trail** - Track when apps were added/updated
6. **Future Planning** - See potential for feature sharing

---

## 🎉 Summary

**The Application Registry is now live!**

- ✅ 2 applications registered (TutorWise + Vinite)
- ✅ Complete tech stack mapping
- ✅ Feature deployment tracking
- ✅ Service inventory
- ✅ Easy viewing via `npm run cas:apps`

**Every app managed by CAS/SADD is now visible and tracked!**

---

*Part of CAS (Contextual Autonomous System)*
