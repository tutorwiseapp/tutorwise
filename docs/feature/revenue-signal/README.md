# Revenue Signal Documentation

**Feature:** Blog Attribution & Demand Orchestrator
**Status:** Phase 1-3 Complete (Signal Detection), Phases 4-7 Planned
**Version:** 3.0
**Last Updated:** 2026-01-18

---

## Quick Navigation

### 📚 Core Documentation

1. **[REVENUE-SIGNAL.md](./REVENUE-SIGNAL.md)** - Complete Specification
   - Executive overview and system architecture
   - SEO foundation details
   - Attribution & analytics (Phase 1-3)
   - Distribution layer (Frozen v1)
   - Future phases (4-7)
   - Monitoring & operations

2. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment Guide
   - Pre-deployment checklist
   - Migration 187 instructions
   - Environment variable setup
   - Known issues & resolutions
   - Post-deployment verification
   - Rollback procedures

3. **[SIGNAL-MIGRATION-PLAN.md](./SIGNAL-MIGRATION-PLAN.md)** - Database Migration Strategy
   - Zero-downtime migration architecture
   - Week-by-week implementation plan
   - Old → New table mapping
   - Migration timeline (Weeks 1-4)

4. **[SIGNAL_ID_IMPLEMENTATION_PLAN.md](./SIGNAL_ID_IMPLEMENTATION_PLAN.md)** - Journey Tracking Specification
   - signal_id architecture (distribution vs organic)
   - Multi-touch attribution models
   - Event taxonomy
   - Integration guide

---

## Document Purpose Matrix

| Document | Purpose | Audience | When to Read |
|----------|---------|----------|--------------|
| **REVENUE-SIGNAL.md** | Feature specification & roadmap | Product, Engineering | Planning new phases, understanding system |
| **DEPLOYMENT.md** | Operations & deployment | DevOps, Engineering | Deploying to production, troubleshooting |
| **SIGNAL-MIGRATION-PLAN.md** | Database migration strategy | Database admins, Backend engineers | Running migrations, understanding schema changes |
| **SIGNAL_ID_IMPLEMENTATION_PLAN.md** | Journey tracking architecture | Frontend/Backend engineers | Implementing attribution tracking, integrating signal_id |

---

## Implementation Status

### ✅ Completed (Phase 1-3)

- **Week 1:** Signal events infrastructure (`signal_events`, `signal_metrics` tables)
- **Week 2:** Distribution tracking (`signal_distributions`, `signal_experiments` tables)
- **Week 3:** Updated RPCs to use signal_events (Migration 187)
- **Week 4:** Signal journey tracking & multi-touch attribution

**Dashboard:** `/admin/signal` (formerly `/admin/blog/orchestrator` - redirects automatically)

**Key Features:**
- Event-based attribution tracking
- Signal journey viewer (trace user path from first touch to conversion)
- Multi-touch attribution models (First-Touch, Last-Touch, Linear)
- Conversion funnel analysis
- Article performance metrics
- Listing visibility correlation

### 🚧 In Progress

- None currently

### 📋 Planned (Phase 4-7)

- **Phase 4:** User-driven distribution (referral sharing)
- **Phase 5:** Marketplace cross-promotion
- **Phase 6:** Attribution model selection
- **Phase 7:** A/B testing framework

---

## Quick Reference

### Database Tables

```
signal_events           - Immutable event log (source of truth)
signal_metrics          - Aggregated performance metrics
signal_distributions    - Distribution tracking (LinkedIn, social)
signal_experiments      - A/B test results (Phase 7)
```

### Key RPCs (Migration 187)

```sql
get_article_performance_summary(p_days, p_attribution_window_days)
get_conversion_funnel(p_days, p_attribution_window_days)
get_blog_assisted_listings(p_days, p_attribution_window_days)
get_time_to_conversion_distribution(p_days, p_attribution_window_days)
get_signal_journey(p_signal_id)                                      -- NEW
get_attribution_comparison(p_days)                                   -- NEW
```

### API Routes

```
/api/admin/signal/stats             - Overview metrics
/api/admin/signal/top-articles      - Top performing articles
/api/admin/signal/listings          - Blog-assisted listings
/api/admin/signal/journey           - Signal journey details
/api/admin/signal/attribution       - Attribution model comparison
```

**Note:** Old routes (`/api/admin/blog/orchestrator/*`) redirect automatically (308 Permanent Redirect)

### Frontend Components

```
/admin/signal                                  - Revenue Signal Analytics (main dashboard)
  ├── Overview                                 - KPI cards, summary
  ├── Top Articles                             - Article performance table
  ├── Conversion Funnel                        - Stage-by-stage funnel
  ├── Listing Visibility                       - Blog-assisted listings
  ├── Signal Journeys                          - Journey trace viewer
  └── Attribution Models                       - Model comparison
```

**Note:** Old route (`/admin/blog/orchestrator`) redirects automatically to `/admin/signal`

---

## Related Documentation

### Within docs/feature/revenue-signal/

- **[REVENUE-SIGNAL.md](./REVENUE-SIGNAL.md)** - Complete specification
- **[SIGNAL-ROUTE-MIGRATION.md](./SIGNAL-ROUTE-MIGRATION.md)** - Route migration details (Blog Orchestrator → Revenue Signal)
- **[RBAC-ALIGNMENT.md](./RBAC-ALIGNMENT.md)** - RBAC system and Migration 189/190
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment procedures
- **[SIGNAL_ID_IMPLEMENTATION_PLAN.md](./SIGNAL_ID_IMPLEMENTATION_PLAN.md)** - Journey tracking architecture
- **[SIGNAL-MIGRATION-PLAN.md](./SIGNAL-MIGRATION-PLAN.md)** - Database migration strategy

### Within docs/feature/

- `docs/feature/seo/` - SEO foundation details
- `docs/feature/admin-dashboard/` - Admin UI patterns
- `docs/feature/notifications/` - Event notification system

### Root Directory

- `1-Michael-ToDo/infrastructure-tasks.md` - Redis configuration task
- `package.json` - Dependencies (see `@upstash/redis`, `@tanstack/react-query`)

---

## Getting Started

### For New Team Members

1. **Read:** [REVENUE-SIGNAL.md](./REVENUE-SIGNAL.md) (Executive Overview section)
2. **Review:** [SIGNAL_ID_IMPLEMENTATION_PLAN.md](./SIGNAL_ID_IMPLEMENTATION_PLAN.md) (Architecture section)
3. **Explore:** Visit `/admin/signal` in staging/production
4. **Understand:** Check `signal_events` table in Supabase

### For Deployment

1. **Read:** [DEPLOYMENT.md](./DEPLOYMENT.md) (Full guide)
2. **Verify:** Run pre-migration verification queries
3. **Deploy:** Apply Migration 187
4. **Test:** Follow post-deployment checklist

### For Development

1. **Read:** [SIGNAL_ID_IMPLEMENTATION_PLAN.md](./SIGNAL_ID_IMPLEMENTATION_PLAN.md) (Event taxonomy)
2. **Review:** API route implementations in `apps/web/src/app/api/admin/signal/`
3. **Test:** Use `useBlogAttribution` hook in blog components
4. **Verify:** Check events in `signal_events` table after interactions

---

## Support

### Common Questions

**Q: Where do I start if I want to understand how blog attribution works?**
A: Read [REVENUE-SIGNAL.md](./REVENUE-SIGNAL.md) → "Attribution & Analytics (Phase 1-3)" section

**Q: How do I deploy Migration 187?**
A: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) → "Database Migrations" section

**Q: What's the difference between signal_id formats (dist_* vs session_*)?**
A: Read [SIGNAL_ID_IMPLEMENTATION_PLAN.md](./SIGNAL_ID_IMPLEMENTATION_PLAN.md) → "Signal ID Architecture" section

**Q: How do I add a new attribution event?**
A: Use `useBlogAttribution` hook → call `trackEvent()` with appropriate event_type and target_type

**Q: Where can I see attribution data in the dashboard?**
A: Visit `/admin/signal` → "Signal Journeys" or "Attribution Models" tabs

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.1 | 2026-01-18 | Strategic migration: Blog Orchestrator → Revenue Signal (Migration 190) |
| 3.0 | 2026-01-18 | Migration 187 deployed, signal journey tracking live |
| 2.0 | 2026-01-16 | Distribution v1 frozen, focus on Phase 3 completion |
| 1.0 | 2025-12-XX | Initial specification, Phase 1-2 complete |

---

**Last Updated:** 2026-01-18
**Latest Change:** Routes migrated from `/admin/blog/orchestrator` → `/admin/signal` (see [SIGNAL-ROUTE-MIGRATION.md](./SIGNAL-ROUTE-MIGRATION.md))
