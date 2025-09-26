# Jira & GitHub Projects Integration with Claude Code

## 🎯 Overview

This integration allows Claude Code to access your Jira tickets and GitHub Projects for enhanced context engineering. It automatically syncs project data into the `.ai/` directory for seamless AI-assisted development.

## 🚀 Quick Start - Jira Integration

### 1. Setup Jira API Access

1. **Generate API Token**:
   - Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Click "Create API token"
   - Name: "Claude Code Integration"
   - **Save the token securely**

2. **Configure Environment**:
   Create or update `.env.local` in your project root:

   ```env
   # Jira Integration
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@domain.com
   JIRA_API_TOKEN=your-generated-api-token
   JIRA_PROJECT_KEY=TUTORWISE
   ```

### 2. Install Dependencies

```bash
cd .ai/integrations
npm install
```

### 3. Run Jira Sync

```bash
# From project root
node .ai/integrations/sync-jira.js
```

### 4. Verify Integration

Check that these files are created:
- `.ai/jira/current-sprint.md` - Sprint overview
- `.ai/jira/tickets/PROJ-123.md` - Individual ticket files
- `.ai/PROMPT.md` - Updated with Jira context

## 📋 What Gets Synced

### Sprint Overview
- Current/recent sprint details
- Sprint goal and timeline
- Issue status breakdown
- Progress summary

### Individual Tickets
- Full ticket details (summary, description, status)
- Assignee, priority, labels
- Direct links to Jira
- Creation/update timestamps

### Context Integration
- Key tickets automatically added to main PROMPT.md
- Priority items highlighted
- Active development work summarized

## 🔄 Usage Workflow

### Daily Development
1. **Morning**: Run `node .ai/integrations/sync-jira.js`
2. **Development**: Claude Code has full context of current sprint
3. **Reference tickets**: Claude can understand requirements and acceptance criteria
4. **Link implementations**: Connect code changes to specific Jira issues

### Before Code Reviews
1. Sync latest Jira state
2. Claude can verify implementations match ticket requirements
3. Generate PR descriptions linked to Jira tickets

## 📁 File Structure After Sync

```
.ai/
├── PROMPT.md                    # Updated with Jira context
├── jira/
│   ├── current-sprint.md       # Sprint overview
│   └── tickets/
│       ├── PROJ-101.md         # Individual ticket details
│       ├── PROJ-102.md
│       └── ...
└── integrations/
    ├── sync-jira.js            # Sync runner
    ├── simple-jira-sync.ts     # Core sync logic
    └── README.md               # This file
```

## 🛠 Advanced Usage

### Automated Sync with Git Hooks

Add to `.git/hooks/post-merge`:
```bash
#!/bin/bash
echo "🔄 Syncing Jira context after merge..."
node .ai/integrations/sync-jira.js
```

### NPM Script Integration

Add to `package.json`:
```json
{
  "scripts": {
    "sync:jira": "node .ai/integrations/sync-jira.js",
    "dev:with-context": "npm run sync:jira && npm run dev"
  }
}
```

## 🔧 Troubleshooting

### Authentication Issues
- ✅ Verify JIRA_EMAIL matches your Atlassian account
- ✅ Ensure API token is generated correctly
- ✅ Check account has project access

### Project Not Found
- ✅ Verify JIRA_BASE_URL format (https://domain.atlassian.net)
- ✅ Confirm JIRA_PROJECT_KEY exists
- ✅ Ensure project has a board/sprints configured

### No Active Sprint
- ✅ The tool will sync the most recent closed sprint if no active one
- ✅ Verify your project uses Scrum/Kanban boards
- ✅ Check sprint configuration in Jira

## 🐙 GitHub Projects Integration

### 1. Setup GitHub API Access

1. **Generate Personal Access Token**:
   - Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Name: "Claude Code Integration"
   - Scopes: `repo`, `read:project`
   - **Save the token securely**

2. **Configure Environment**:
   Add to your `.env.local`:

   ```env
   # GitHub Integration
   GITHUB_TOKEN=ghp_your_token_here
   GITHUB_OWNER=tutorwiseapp
   GITHUB_REPO=tutorwise
   GITHUB_PROJECT_NUMBER=1  # Optional: for GitHub Projects v1
   ```

### 2. Run GitHub Sync

```bash
# Sync GitHub data
npm run sync:github

# Or sync both Jira and GitHub
npm run sync:context
```

### 3. Verify GitHub Integration

Check that these files are created:
- `.ai/github/repository-overview.md` - Repo status and recent activity
- `.ai/github/issues/123.md` - Individual issue files
- `.ai/github/pull-requests/45.md` - PR details
- `.ai/github/project-board.md` - Project board overview (if configured)

## 📊 What Gets Synced from GitHub

### Repository Overview
- Recent issues and pull requests
- Repository statistics and metadata
- Open issues and PRs summary
- Recent activity timeline

### Individual Issues
- Full issue details and description
- Labels, assignees, milestones
- Creation/update timestamps
- Direct GitHub links

### Pull Requests
- PR status and details
- Author and reviewers
- Associated issues
- Merge status

### Project Boards
- Board columns and status
- Issue/PR organization
- Project progress overview

## 📞 Support

If you encounter issues:
1. Check the error messages for specific guidance
2. Verify all environment variables are set
3. Test Jira API access manually: `curl -u email:token https://domain.atlassian.net/rest/api/3/myself`

---

**🎉 Happy coding with enhanced context awareness!**