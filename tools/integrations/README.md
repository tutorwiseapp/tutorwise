# TutorWise CLI Integrations

This directory contains installation scripts and configuration for external CLI tools used in the TutorWise project.

## Quick Start

```bash
# Install all CLI integrations
cd tools/integrations
./setup-integrations.sh

# Or use npm scripts from tools/ directory
cd tools
npm run setup
```

## Available Integrations

### Deployment Tools

#### Railway CLI
- **Purpose**: Deploy to Railway platform
- **Installation**: `./install-railway.sh`
- **Version**: 4.10.0+
- **Auth Required**: `railway login`

#### Vercel CLI
- **Purpose**: Deploy to Vercel platform
- **Installation**: `./install-vercel.sh`
- **Version**: Latest
- **Auth Required**: `vercel login`

### Database Tools

#### Supabase CLI
- **Purpose**: Database management and migrations
- **Installation**: `./install-supabase.sh`
- **Version**: Latest
- **Auth Required**: `supabase login`

### Testing Tools

#### Playwright
- **Purpose**: End-to-end testing
- **Installation**: `./install-playwright.sh`
- **Version**: 1.55.1
- **Auth Required**: None

#### Percy
- **Purpose**: Visual regression testing
- **Installation**: `./install-percy.sh`
- **Version**: Latest
- **Auth Required**: `PERCY_TOKEN` environment variable

#### Jest
- **Purpose**: Unit testing
- **Installation**: Included in project
- **Version**: 30.1.3
- **Auth Required**: None

## Installation Scripts

### `setup-integrations.sh`
Master installation script that:
- Makes all scripts executable
- Installs Railway CLI
- Installs Vercel CLI
- Provides next steps for authentication

### `install-railway.sh`
- Checks for existing installation
- Installs @railway/cli globally via npm
- Verifies installation success

### `install-vercel.sh`
- Checks for existing installation
- Installs vercel globally via npm
- Verifies installation success

## Authentication

After installation, authenticate with each service:

```bash
# Deployment Tools
railway login
vercel login

# Database Tools
supabase login

# Testing Tools (environment variables)
export PERCY_TOKEN=your_percy_token_here
```

## Next Steps

1. **Setup**: Run `./setup-integrations.sh`
2. **Authenticate**: Login to each service
3. **Deploy**: Use scripts in `../scripts/` directory
4. **Monitor**: Use `../scripts/health-check.sh` to verify status

## Adding New Integrations

To add a new CLI tool:

1. Create `install-[tool].sh` script
2. Add to `setup-integrations.sh`
3. Create deployment script in `../scripts/`
4. Update `../package.json` scripts
5. Update `../integration-status.json`
6. Document in this README

## Related Files

- `../scripts/` - Deployment and utility scripts
- `../package.json` - npm scripts for easy access
- `../integration-status.json` - Current integration status
- `../../.claude/integrations.md` - Claude Code documentation