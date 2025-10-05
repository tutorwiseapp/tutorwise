# TutorWise Shell Aliases Setup

## Overview

This document explains how to set up shell aliases for TutorWise commands, allowing you to type short commands like `cas-startup` instead of full `npm run cas-startup` commands.

## Quick Start

### Setup Aliases (One-time)

```bash
# Run the setup script
npm run setup-aliases

# Activate aliases immediately
source ~/.zshrc  # or ~/.bashrc
```

## Available Aliases

### CAS Startup Manager
| Alias | Command | Description |
|-------|---------|-------------|
| `cas-startup` | `npm run cas-startup` | Interactive startup manager |
| `cas-status` | `npm run cas-startup:status` | Show all service statuses |
| `cas-start` | `npm run cas-startup:start-all` | Start all services |
| `cas-stop` | `npm run cas-startup:stop-all` | Stop all services |
| `cas-restart` | `npm run cas-startup:restart-all` | Restart all services |

### Development Servers
| Alias | Command | Description |
|-------|---------|-------------|
| `dev-web` | `npm run dev:web` | Start Next.js frontend |
| `dev-api` | `npm run dev:api` | Start FastAPI backend |
| `dev-all` | `npm run dev` | Start both servers |

### Jira Integration
| Alias | Command | Description |
|-------|---------|-------------|
| `jira-test` | `npm run jira:test-tasks` | Test Jira connection |
| `jira-poll` | `npm run jira:poll:continuous` | Start Jira polling |

### Calendar Integration
| Alias | Command | Description |
|-------|---------|-------------|
| `calendar-test` | `npm run calendar:test-tasks` | Test Google Calendar |
| `calendar-poll` | `npm run calendar:poll:continuous` | Start Calendar polling |

### Sync Commands
| Alias | Command | Description |
|-------|---------|-------------|
| `sync-jira` | `npm run sync:jira` | Sync with Jira |
| `sync-github` | `npm run sync:github` | Sync with GitHub |
| `sync-context` | `npm run sync:context` | Sync context |
| `sync-confluence` | `npm run sync:confluence` | Sync to Confluence |
| `sync-google-docs` | `npm run sync:google-docs` | Sync to Google Docs |
| `sync-calendar-jira` | `npm run sync:calendar-to-jira:continuous` | Sync Calendar to Jira |

### CAS (Context Autonomous System)
| Alias | Command | Description |
|-------|---------|-------------|
| `cas-generate` | `npm run cas:generate` | Generate AI context |
| `cas-setup` | `npm run context:setup` | Setup context engineering |

### Testing
| Alias | Command | Description |
|-------|---------|-------------|
| `test-web` | `npm run test` | Run frontend tests |
| `test-api` | `npm run test:backend` | Run backend tests |
| `test-e2e` | `npm run test:e2e` | Run E2E tests |
| `test-integrations` | `node tools/scripts/utilities/test-integrations.js` | Test all integrations |

### Build & Deploy
| Alias | Command | Description |
|-------|---------|-------------|
| `build-web` | `npm run build` | Build frontend |
| `deploy-railway` | `bash tools/scripts/railway-deploy.sh` | Deploy to Railway |

### Other
| Alias | Command | Description |
|-------|---------|-------------|
| `health-check` | `bash tools/scripts/health-check.sh` | Run system health check |
| `claude-login` | `npm run claude:login` | Initialize Claude Code session |

## Usage Examples

```bash
# Instead of: npm run cas-startup
cas-startup

# Instead of: npm run cas-startup:status
cas-status

# Instead of: npm run dev:web
dev-web

# Instead of: npm run test:e2e
test-e2e
```

## Direct Script Execution (Option 3)

All scripts in `/tools/scripts/` are executable and can be run directly:

```bash
# Run cas-startup directly
./tools/scripts/cas-startup.sh

# Run with arguments
./tools/scripts/cas-startup.sh status

# Run from anywhere in the project (using absolute path)
bash /Users/michaelquan/projects/tutorwise/tools/scripts/cas-startup.sh
```

## How It Works

The `setup-aliases.sh` script:
1. Detects your shell (zsh or bash)
2. Creates a backup of your shell config file
3. Adds alias definitions to `~/.zshrc` or `~/.bashrc`
4. Provides instructions to activate aliases

## Manual Setup

If you prefer to add aliases manually, add this to your `~/.zshrc` or `~/.bashrc`:

```bash
# TutorWise CAS Aliases
alias cas-startup='npm run cas-startup'
alias cas-status='npm run cas-startup:status'
alias cas-start='npm run cas-startup:start-all'
alias cas-stop='npm run cas-startup:stop-all'
alias cas-restart='npm run cas-startup:restart-all'

# Development
alias dev-web='npm run dev:web'
alias dev-api='npm run dev:api'
alias dev-all='npm run dev'

# Add more as needed...
```

Then reload your shell:
```bash
source ~/.zshrc  # or ~/.bashrc
```

## Updating Aliases

To update aliases after changes:

```bash
# Re-run setup (will prompt to update)
npm run setup-aliases

# Or manually edit ~/.zshrc or ~/.bashrc
```

## Removing Aliases

To remove TutorWise aliases:

```bash
# Open your shell config
nano ~/.zshrc  # or ~/.bashrc

# Delete the section between:
# # TutorWise CAS Aliases
# ... aliases ...
# # End TutorWise CAS Aliases

# Reload shell
source ~/.zshrc  # or ~/.bashrc
```

## Troubleshooting

### Aliases not working
```bash
# Check if aliases are defined
alias | grep cas-

# If not found, reload shell config
source ~/.zshrc  # or ~/.bashrc

# Or restart terminal
```

### Command not found
```bash
# Ensure you're in the project root when using npm run commands
cd /Users/michaelquan/projects/tutorwise

# Or use full paths for direct execution
./tools/scripts/cas-startup.sh
```

### Permission denied
```bash
# Make scripts executable
chmod +x tools/scripts/*.sh
```

## Standard Approach (npm run)

While aliases are convenient, the standard approach using `npm run` is still recommended for:
- CI/CD pipelines
- Documentation and tutorials
- Sharing commands with team members
- Ensuring consistency across environments

Aliases are optional and designed for personal productivity enhancement.

## See Also

- [CAS Startup Utility README](./STARTUP-UTILITY-README.md)
- [Quick Start Guide](/QUICK-START.md)
- [Main README](/README.md)
