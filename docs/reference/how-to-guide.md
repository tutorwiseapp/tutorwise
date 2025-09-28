# Tutorwise AI Integration How-To Guide

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Jira Integration](#jira-integration)
3. [GitHub Integration](#github-integration)
4. [Google Calendar Integration](#google-calendar-integration)
5. [Google Docs Integration](#google-docs-integration)
6. [Mermaid Diagrams Integration](#mermaid-diagrams-integration)
7. [Gemini CLI Integration](#gemini-cli-integration)
8. [Automation Workflows](#automation-workflows)
9. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Prerequisites
- Node.js 18+ installed
- Python 3.8+ installed
- Git repository initialized
- Access to your organization's Jira, GitHub, and Google services

### Environment Configuration

Create or update `.env.local` file in project root:

```bash
# Core AI Integration
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=TUTORWISE

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your-github-username
GITHUB_REPO=tutorwise

# Google Services Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
your_private_key_content_here
-----END PRIVATE KEY-----"
```

### Directory Structure
The system will create the following structure:
```
.ai/
├── docs/                    # Documentation
├── integrations/            # Integration scripts
├── scripts/                 # Utility and CLI scripts
├── jira/                   # Jira data
│   ├── current-sprint.md
│   └── tickets/
├── github/                 # GitHub data
├── calendar/               # Calendar data
├── google-docs/            # Google Docs data
├── mermaid/               # Mermaid diagrams
└── PROMPT.md              # Main context file
```

---

## Jira Integration

### Setup Process

1. **Get Jira API Token**
   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Create new token
   - Copy token to `.env.local` as `JIRA_API_TOKEN`

2. **Configure Jira Settings**
   ```bash
   JIRA_BASE_URL=https://yourcompany.atlassian.net
   JIRA_EMAIL=your.email@company.com
   JIRA_PROJECT_KEY=TUTORWISE  # Your project key
   ```

3. **Test Connection**
   ```bash
   npm run sync:jira
   ```

### What Gets Synced
- Current active sprint details
- Individual ticket information including:
  - Basic fields (summary, description, status, assignee)
  - Time tracking (original estimate, time spent, remaining)
  - Relationships (parent, epic, subtasks, links)
  - Custom fields and components
  - Comments and attachments metadata
  - Workflow and status information

### Generated Files
- `.ai/jira/current-sprint.md` - Sprint overview
- `.ai/jira/tickets/TICKET-KEY.md` - Individual ticket details
- Updates main `.ai/PROMPT.md` with sprint context

### Usage Examples
```bash
# Sync Jira data
npm run sync:jira

# Use with Gemini CLI
npm run gemini:analyze -- -t TUTOR-20

# View synced data
cat .ai/jira/current-sprint.md
```

---

## GitHub Integration

### Setup Process

1. **Create Personal Access Token**
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Generate token with `repo` scope
   - Add to `.env.local` as `GITHUB_TOKEN`

2. **Configure Repository**
   ```bash
   GITHUB_OWNER=your-username
   GITHUB_REPO=tutorwise
   ```

3. **Test Sync**
   ```bash
   npm run sync:github
   ```

### What Gets Synced
- Repository overview and statistics
- Open issues with labels and assignees
- Pull requests status and reviews
- Repository metrics and activity

### Generated Files
- `.ai/github/repository-overview.md` - Complete repository context
- Updates main `.ai/PROMPT.md` with GitHub status

---

## Google Calendar Integration

### Setup Process

1. **Create Service Account**
   - Go to Google Cloud Console
   - Create new service account
   - Download JSON key file
   - Extract email and private key for `.env.local`

2. **Share Calendar**
   - Open Google Calendar
   - Share development calendar with service account email
   - Grant "Make changes and manage sharing" permission

3. **Configure Environment**
   ```bash
   GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
   ```

4. **Test Sync**
   ```bash
   npm run sync:calendar
   ```

### What Gets Synced
- Upcoming development events (next 30 days)
- Event analysis for development impact
- Project milestones and deadlines
- Meeting schedules affecting development

### Generated Files
- `.ai/calendar/development-schedule.md` - Development schedule
- Updates main `.ai/PROMPT.md` with calendar context

---

## Google Docs Integration

### Setup Process

1. **Use Same Service Account** (from Calendar setup)

2. **Share Documents**
   - Share relevant Google Docs with service account email
   - Grant "Viewer" or "Editor" permission as needed

3. **Test Sync**
   ```bash
   npm run sync:google-docs
   ```

### What Gets Synced
- Document content and structure
- Recent changes and modifications
- Document metadata and permissions
- Links between documents

### Generated Files
- `.ai/google-docs/overview.md` - Documents overview
- `.ai/google-docs/documents/` - Individual document content

---

## Mermaid Diagrams Integration

### Setup Process

1. **Create Diagrams Directory**
   ```bash
   mkdir -p diagrams
   ```

2. **Add Mermaid Files**
   - Create `.mmd` files in `diagrams/` directory
   - Use standard Mermaid syntax

3. **Sync Diagrams**
   ```bash
   npm run sync:mermaid
   ```

### Supported Diagram Types
- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- Entity Relationship diagrams
- User Journey diagrams

### Generated Files
- `.ai/mermaid/overview.md` - Diagrams overview
- `.ai/mermaid/diagrams/*.html` - Rendered diagram files
- Updates main `.ai/PROMPT.md` with diagram context

### Example Diagram
```mermaid
graph TD
    A[User Request] --> B[Authentication]
    B --> C[Authorization]
    C --> D[Process Request]
    D --> E[Response]
```

---

## Gemini CLI Integration

### Setup Process

1. **Run Setup Script**
   ```bash
   ./.ai/scripts/setup-gemini.sh
   ```

2. **Get Gemini API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Create API key
   - Add to `.env.local`:
   ```bash
   GOOGLE_AI_API_KEY=your_gemini_api_key
   ```

3. **Test Installation**
   ```bash
   npm run gemini:interactive
   ```

### Available Commands

**Interactive Mode**
```bash
npm run gemini               # Interactive menu
npm run gemini:interactive   # Direct interactive mode
npm run ai:gemini           # Sync context + interactive
```

**Direct Commands**
```bash
npm run gemini:chat -- -q "How to add authentication?"
npm run gemini:analyze -- -t TUTOR-20
npm run gemini:review -- -q "Review my payment code"
npm run gemini:debug -- -q "API returning 404 errors"
npm run gemini:plan
```

**Workflow Script**
```bash
./.ai/scripts/gemini-workflow.sh    # Interactive menu
./.ai/scripts/gemini-cli.py --help  # CLI help
```

### Usage Scenarios

**Ticket Analysis**
```bash
npm run gemini:analyze -- -t TUTOR-20
```

**Code Review**
```bash
npm run gemini:review -- -q "Review my authentication middleware for security issues"
```

**Debug Help**
```bash
npm run gemini:debug -- -q "Users getting JWT validation errors on login"
```

**Development Planning**
```bash
npm run gemini:plan
```

---

## Automation Workflows

### Daily Development Workflow

1. **Morning Context Sync**
   ```bash
   npm run sync:context
   ```

2. **Review Sprint Status**
   ```bash
   cat .ai/jira/current-sprint.md
   ```

3. **Get AI Development Plan**
   ```bash
   npm run gemini:plan
   ```

4. **Work on Specific Ticket**
   ```bash
   npm run gemini:analyze -- -t TUTOR-XX
   ```

### Pre-Commit Workflow

```bash
# Sync latest context
npm run sync:context

# Get code review
npm run gemini:review -- -q "Review staged changes for best practices"

# Commit with context
git add . && git commit -m "feat: implement feature based on TUTOR-XX"
```

### Weekly Planning Workflow

```bash
# Full context refresh
npm run sync:all

# Generate comprehensive plan
npm run ai:gemini
# Select option 5 (Development Planning)
```

### Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/context-sync.yml
name: Sync Context
on:
  schedule:
    - cron: '0 9 * * 1-5'  # Weekdays at 9 AM
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run sync:context
      - run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .ai/
          git commit -m "chore: update context data" || exit 0
          git push
```

---

## Troubleshooting

### Common Issues

**Jira Connection Failed**
- Verify API token is correct
- Check base URL format (include https://)
- Ensure email matches Atlassian account
- Test with: `curl -u email:token https://domain.atlassian.net/rest/api/3/myself`

**GitHub API Rate Limit**
- Use personal access token instead of password
- Check rate limit: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`
- Wait for reset or use different token

**Google Services Authentication**
- Verify service account email is correct
- Check private key formatting (include newlines)
- Ensure calendar/docs are shared with service account
- Test permissions in Google Cloud Console

**Gemini CLI Not Working**
- Verify API key at: https://makersuite.google.com/app/apikey
- Check Python dependencies: `pip3 list | grep google-generativeai`
- Test basic connection: `python3 -c "import google.generativeai as genai; print('OK')"`

**Context Files Not Found**
- Ensure you're in project root directory
- Check `.ai/` directory exists
- Run initial sync: `npm run sync:context`
- Verify file permissions

**Environment Variables Not Loading**
- Check `.env.local` exists in project root
- Verify no extra spaces around `=` in env file
- Restart terminal/IDE after changes
- Test with: `echo $GOOGLE_AI_API_KEY`

### Debug Commands

**Check Integration Status**
```bash
# Test all integrations
npm run sync:context

# Individual integration tests
node -e "console.log(process.env.JIRA_API_TOKEN ? 'Jira: OK' : 'Jira: Missing')"
node -e "console.log(process.env.GITHUB_TOKEN ? 'GitHub: OK' : 'GitHub: Missing')"
node -e "console.log(process.env.GOOGLE_AI_API_KEY ? 'Gemini: OK' : 'Gemini: Missing')"
```

**Validate Context Files**
```bash
# Check main context
head -20 .ai/PROMPT.md

# Check Jira sync
ls -la .ai/jira/

# Check integration files
find .ai/ -name "*.md" -exec wc -l {} \;
```

**Test Gemini CLI**
```bash
# Basic functionality test
python3 .ai/scripts/gemini-cli.py --help

# Context loading test
python3 -c "
import os; os.environ['GOOGLE_AI_API_KEY']='test'
exec(open('.ai/scripts/gemini-cli.py').read().split('def main()')[0])
cli = TutorwiseGeminiCLI()
print(f'Loaded: {len(cli.context[\"jira_tickets\"])} tickets')
"
```

### Performance Optimization

**Reduce API Calls**
- Use `--minimal` flag for quick Gemini queries
- Cache integration results for 1 hour
- Sync only changed tickets in Jira

**Context Size Management**
- Limit ticket descriptions to 200 characters in overviews
- Use pagination for large result sets
- Archive old tickets from active context

**Response Time Improvement**
- Use streaming responses for long AI outputs
- Parallel API calls where possible
- Local caching of static content

---

## Best Practices

### Security
- Never commit API keys to version control
- Use service accounts with minimal required permissions
- Regularly rotate API tokens
- Monitor API usage and set alerts

### Maintenance
- Weekly full context sync
- Monthly review of integration configurations
- Quarterly cleanup of old context files
- Regular backup of `.ai/` directory

### Development
- Use context-aware AI for all development decisions
- Document integration changes in commit messages
- Test integrations after environment changes
- Keep integration documentation updated

### Team Collaboration
- Share integration setup guides with team
- Use consistent environment variable naming
- Document custom workflows in team wiki
- Regular training on AI-assisted development