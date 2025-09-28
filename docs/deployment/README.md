# Deployment Documentation

This folder contains deployment guides, CI/CD processes, and infrastructure deployment documentation for the Tutorwise platform.

## Structure

```
deployment/
├── README.md                    # This file
├── vercel-deployment.md         # Frontend deployment to Vercel
├── railway-deployment.md        # Backend deployment to Railway
├── environment-setup.md         # Environment variables and configuration
├── ci-cd-pipeline.md           # Continuous integration and deployment
├── rollback-procedures.md       # Rollback and recovery procedures
└── monitoring-setup.md          # Deployment monitoring and alerts
```

## Deployment Environments

- **Frontend**: Vercel (apps/web)
- **Backend**: Railway (apps/api)
- **Database**: Supabase PostgreSQL, Neo4j Aura
- **Monitoring**: Platform-integrated monitoring

## Quick Commands

```bash
# Frontend deployment
npm run build                    # Build web app
vercel --prod                   # Deploy to production

# Backend deployment
railway up                      # Deploy API to Railway
railway logs                   # View deployment logs
```

## Guidelines

When documenting deployments:
1. Include step-by-step deployment procedures
2. Document environment-specific configurations
3. Provide rollback and recovery procedures
4. Include monitoring and health check setup
5. Document secrets and environment variable management
6. Update this index when adding new files