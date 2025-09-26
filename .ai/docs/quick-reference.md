# Tutorwise AI Integration Quick Reference

## Quick Start Commands

### Daily Workflow
```bash
# Morning setup
npm run sync:context && npm run gemini:plan

# Work on ticket
npm run gemini:analyze -- -t TUTOR-XX

# Code review
npm run gemini:review -- -q "Review my implementation"

# Quality check before commit
npm run quality:check
```

### Essential NPM Scripts
```bash
# AI Assistance
npm run gemini                 # Interactive menu
npm run ai:gemini             # Sync + interactive
npm run gemini:interactive     # Direct chat

# Context Sync
npm run sync:context          # Core sync (daily)
npm run sync:all             # Full sync (weekly)
npm run sync:jira            # Jira only

# Development
npm run dev:with-context      # Dev with fresh context
npm run test:all             # All tests
npm run quality:check        # Lint + tests
```

## Integration Setup Checklist

### Required Environment Variables
```bash
# Essential
GOOGLE_AI_API_KEY=your_gemini_key

# Jira
JIRA_BASE_URL=https://company.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your_token

# GitHub
GITHUB_TOKEN=your_github_token

# Google Services
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

### Setup Steps
1. Run: `./.ai/scripts/setup-gemini.sh`
2. Get API keys from respective services
3. Add to `.env.local`
4. Test: `npm run sync:context`
5. Start: `npm run ai:gemini`

## Gemini CLI Quick Commands

### Direct Usage
```bash
# Chat
npm run gemini:chat -- -q "How to implement feature X?"

# Ticket analysis
npm run gemini:analyze -- -t TUTOR-20

# Code review
npm run gemini:review -- -q "Review authentication code"

# Debug help
npm run gemini:debug -- -q "API returning 404 errors"

# Planning
npm run gemini:plan
```

## File Locations

### Generated Context Files
```
.ai/
├── PROMPT.md                 # Main context
├── jira/
│   ├── current-sprint.md     # Sprint overview
│   └── tickets/              # Individual tickets
├── github/
│   └── repository-overview.md
├── calendar/
│   └── development-schedule.md
├── mermaid/
│   ├── overview.md
│   └── diagrams/             # Rendered diagrams
└── docs/                     # Documentation
    ├── how-to-guide.md       # Complete setup guide
    ├── integration-overview.md  # Technical architecture
    ├── npm-scripts-reference.md # All NPM scripts
    ├── quick-reference.md    # This file
    └── role-management-*.md  # Role management docs
```

### Configuration Files
```
.claude/
├── settings.json             # Base Claude Code configuration
├── settings.local.json       # Local overrides
├── config.template.json      # Configuration template
└── README.md                # Claude Code configuration docs

.gemini/
├── settings.json             # Base Gemini configuration
├── settings.local.json       # Local overrides (gitignored)
├── config.template.env       # Environment template
└── README.md                # Gemini CLI configuration docs
```

## Troubleshooting Quick Fixes

### Common Issues
```bash
# Gemini CLI not working
python3 .ai/scripts/gemini-cli.py --help

# Context files missing
npm run sync:context

# Environment variables not loading
echo $GOOGLE_AI_API_KEY

# Sync failures
npm run sync:jira  # Test individual sync
```

## API Key Setup Links

- **Gemini AI**: https://makersuite.google.com/app/apikey
- **Jira**: https://id.atlassian.com/manage-profile/security/api-tokens
- **GitHub**: Settings > Developer settings > Personal access tokens
- **Google Cloud**: Console > IAM & Admin > Service Accounts

## Best Practices

### Daily Routine
1. `npm run sync:context` - Fresh context
2. `npm run gemini:plan` - Daily planning
3. Work on tickets with AI assistance
4. `npm run quality:check` before commits

### Weekly Routine
1. `npm run sync:all` - Full context refresh
2. Review integration health
3. Clean up old context files
4. Update documentation

## Support Resources

### Documentation
- `.ai/docs/how-to-guide.md` - Complete setup guide
- `.ai/docs/integration-overview.md` - Technical overview
- `.ai/docs/npm-scripts-reference.md` - All NPM scripts

### Help Commands
```bash
npm run gemini -- --help      # Gemini CLI help
.ai/scripts/gemini-workflow.sh --help  # Workflow help
.ai/scripts/setup-gemini.sh   # Setup and verification
```