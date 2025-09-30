# Claude Code Integrations for TutorWise

This document outlines the available integrations and CLI tools for Claude Code when working with the TutorWise project.

## Integration Architecture

```
TutorWise Project/
├── .claude/
│   └── integrations.md          # This file - Claude Code reference
├── tools/
│   ├── integrations/            # CLI installation scripts
│   ├── scripts/                 # Deployment wrapper scripts
│   ├── package.json            # npm scripts for tools
│   └── integration-status.json # Current integration status
```

## Available CLI Integrations

### Native MCP Integrations
- **Supabase**: `mcp__ide__` tools available
- **IDE Features**: Diagnostics, code execution

### CLI-Based Integrations
- **Railway**: Via `railway` command
- **Vercel**: Via `vercel` command
- **Git**: Native bash integration
- **npm/Node.js**: Native bash integration

## Deployment Workflows

### Railway Deployment
```bash
# Via npm script
cd tools && npm run deploy:railway

# Direct script
./tools/scripts/deploy-railway.sh
```

### Vercel Deployment
```bash
# Via npm script
cd tools && npm run deploy:vercel

# Direct script
./tools/scripts/deploy-vercel.sh
```

## Health Monitoring

```bash
# Comprehensive system check
cd tools && npm run health-check

# Direct script
./tools/scripts/health-check.sh
```

Checks:
- CLI tool installations
- Authentication status
- Project linking status
- Build health
- Git status

## Setup for New Environments

```bash
# One-time setup
cd tools && npm run setup

# Individual installations
npm run install:railway
npm run install:vercel
```

## Authentication Requirements

After setup, authenticate with:
- `railway login` - Railway platform
- `vercel login` - Vercel platform

## Adding New Integrations

When adding new CLI tools:

1. **Installation Script**: Create in `tools/integrations/`
2. **Deployment Script**: Create in `tools/scripts/`
3. **Package Scripts**: Add to `tools/package.json`
4. **Status Tracking**: Update `tools/integration-status.json`
5. **Documentation**: Update this file and README

## Best Practices

- **Always use wrapper scripts** for deployments
- **Run health checks** before deployments
- **Keep tools/ directory in version control**
- **Document new integrations** properly
- **Test integration scripts** before committing

## Integration Status

Current integrations are tracked in `tools/integration-status.json` and can be checked via the health check script.

## Related Commands

```bash
# Setup all tools
tools/integrations/setup-integrations.sh

# Health check
tools/scripts/health-check.sh

# Deploy to Railway
tools/scripts/deploy-railway.sh

# Deploy to Vercel
tools/scripts/deploy-vercel.sh
```