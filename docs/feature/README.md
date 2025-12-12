# Tutorwise Features Documentation

**Last Updated**: 2025-12-12
**Total Features**: 40 core features + 14 integrations

## 📋 Documentation Status Legend

| Status | Description |
|--------|-------------|
| 🟢 Active | Actively developed, docs up-to-date (< 30 days) |
| 🟡 Needs Update | Feature active but docs outdated (> 60 days) |
| 🔴 Deprecated | No longer in use, candidate for archiving |
| 📝 Draft | In planning/early development |

## 🎯 Core Features

### User Management & Authentication
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [auth](./auth/) | 🟡 | 2024-11-02 | - | High |
| [account](./account/) | 🟡 | 2024-11-10 | - | High |
| [onboarding](./onboarding/) | 🟢 | 2025-12-11 | solution-design | High |
| [role-management](./role-management/) | 🟡 | 2024-11-01 | - | High |
| [settings](./settings/) | 🟡 | - | - | Medium |

### Profile & Listings
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [public-profile](./public-profile/) | 🟢 | 2025-12-12 | solution-design v4.8 | High |
| [listings](./listings/) | 🟢 | 2025-11-20 | solution-design | High |
| [profile-graph](./profile-graph/) | 🟡 | - | - | Low |

### Booking & Sessions
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [bookings](./bookings/) | 🟡 | 2024-11-11 | - | High |
| [instant-bookings](./instant-bookings/) | 🟡 | 2024-11-02 | - | Medium |
| [caas](./caas/) | 🔴 | 2024-11-16 | solution-design v5.5 | Deprecated |
| [caas-video](./caas-video/) | 🔴 | 2024-11-16 | solution-design v5.6 | Deprecated |

### Communication
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [messages](./messages/) | 🟡 | - | - | High |
| [notifications](./notifications/) | 🟡 | - | - | High |

### Discovery & Search
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [marketplace](./marketplace/) | 🟡 | 2024-10-10 | - | High |
| [search-filters](./search-filters/) | 🟡 | - | - | High |
| [matching-engine](./matching-engine/) | 🟡 | - | - | Medium |
| [recommendations](./recommendations/) | 🟡 | - | - | Low |

### Hub & Dashboard
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [your-home](./your-home/) | 🟡 | - | - | High |
| [dashboard](./dashboard/) | 🟡 | 2024-10-24 | - | High |
| [navigation-menu](./navigation-menu/) | 🟢 | 2025-12-11 | - | High |
| [hub-form](./hub-form/) | 🟢 | 2025-11-20 | - | Medium |
| [hub-row-card](./hub-row-card/) | 🟢 | 2025-11-17 | - | Medium |
| [context-sidebar](./context-sidebar/) | 🟢 | 2025-11-18 | ui-design v2 | Medium |

### Financial
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [payments](./payments/) | 🟡 | - | - | High |
| [transactions](./transactions/) | 🟡 | - | - | High |
| [financials](./financials/) | 🟡 | 2024-11-02 | - | Medium |

### Reviews & Ratings
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [reviews](./reviews/) | 🟡 | - | solution-design v4.5 | High |

### Social & Network
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [network](./network/) | 🟡 | - | - | Medium |
| [referrals](./referrals/) | 🟡 | - | - | Low |
| [wiselists](./wiselists/) | 🟡 | - | - | Medium |

### Organization & Education
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [organisation](./organisation/) | 🟡 | - | - | Medium |
| [students](./students/) | 🟡 | - | - | Medium |
| [wisespace](./wisespace/) | 🟡 | - | - | Low |

### Platform Features
| Feature | Status | Last Updated | Documents | Priority |
|---------|--------|--------------|-----------|----------|
| [admin-dashboard](./admin-dashboard/) | 🟡 | 2024-10-10 | - | Medium |
| [reporting](./reporting/) | 🟡 | - | - | Medium |
| [branding](./branding/) | 🟡 | 2024-11-10 | - | Low |
| [ai-powered](./ai-powered/) | 🟡 | 2024-11-10 | - | Low |
| [free-help-now](./free-help-now/) | 🟡 | 2024-11-16 | - | Low |

## 🔌 Integrations

**Note**: Integration docs will be moved to `Docs/integration/` soon.

### Active Integrations
- integration-supabase - Database & Auth
- integration-stripe - Payments
- integration-resend - Email
- integration-ably-messages - Real-time messaging
- integration-google-calendar - Calendar sync
- integration-google-classroom - Classroom integration
- integration-lessonspace - Video sessions
- integration-pencilspaces - Whiteboard
- integration-hubspot - CRM
- integration-tutorcruncher - Management
- integration-tutorwise-api - API
- integration-railway-neo4j - Graph database
- integration-railway-redis - Caching
- integration-vercel-redis - Edge caching

## 📁 Documentation Standards

Each feature folder should contain:

### Required Files
1. **README.md** - Feature overview, status, quick links
2. **solution-design.md** - Architecture, decisions, data models
3. **implementation.md** - Code structure, setup, how-to guides

### Optional But Recommended
4. **ai-prompt.md** - Context for AI assistants
5. **testing.md** - Test plans and cases
6. **changelog.md** - Version history
7. **api.md** - API endpoints (if applicable)

### File Naming Conventions
- Use kebab-case: `solution-design.md`, `ai-prompt.md`
- Include version numbers when multiple versions exist: `solution-design-v4.8.md`
- Use descriptive names: `public-profile-components.md` not just `components.md`

## 🎯 Quick Actions

### For Contributors
- **Adding a new feature?** See [adding-new-feature.md](./adding-new-feature.md)
- **Updating docs?** Follow the standards above
- **Need AI help?** Check the feature's `ai-prompt.md` file

### For Maintainers
- **Monthly**: Review and update feature statuses in this file
- **Quarterly**: Archive deprecated features to `Docs/archived/`
- **Per release**: Update implementation.md with changes

## 🔍 Find Documentation

### By Priority
- **High**: authentication, account, onboarding, public-profile, listings, bookings, messages, notifications, search, payments
- **Medium**: hub features, financials, organization, admin tools
- **Low**: experimental features, nice-to-haves

### By Status
- **Active (🟢)**: onboarding, public-profile, listings, navigation-menu, hub-form, hub-row-card, context-sidebar
- **Needs Update (🟡)**: Most features - see tables above
- **Deprecated (🔴)**: caas, caas-video

## 📊 Documentation Health

**Last Audit**: 2025-12-12

### Metrics
- Total features documented: 54 (40 core + 14 integrations)
- Features with complete docs: ~8 (15%)
- Features with some docs: ~20 (37%)
- Features needing docs: ~26 (48%)
- Average doc age: ~45 days

### Priority Actions
1. ⚠️ **High Priority**: Update authentication, account, bookings, messages, notifications
2. 📝 **Soon**: Add README.md to all features
3. 🗑️ **Archive**: Move caas features to archived/
4. 📋 **Create**: Add ai-prompt.md to top 10 active features

## 🆘 Help & Resources

- [Feature development workflow](./adding-new-feature.md)
- [Architecture docs](../architecture/)
- [Development guidelines](../development/)
- [Design system](../design/)

---

**Questions?** Open an issue or contact the docs team.
