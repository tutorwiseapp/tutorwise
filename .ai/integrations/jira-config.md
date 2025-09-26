# Jira Integration Configuration

## Setup Instructions

### 1. Jira API Token Generation
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Label: "Claude Code Integration"
4. Copy the generated token

### 2. Environment Variables
Add to your `.env.local`:

```env
# Jira Integration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your-generated-api-token
JIRA_PROJECT_KEY=TUTORWISE
```

### 3. MCP Server Registration
Add to your Claude Code configuration (`~/.config/claude-code/mcp-servers.json`):

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": [".ai/integrations/jira-mcp-server.js"],
      "env": {
        "JIRA_BASE_URL": "${JIRA_BASE_URL}",
        "JIRA_EMAIL": "${JIRA_EMAIL}",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "JIRA_PROJECT_KEY": "${JIRA_PROJECT_KEY}"
      }
    }
  }
}
```

## Usage Examples

### Get Current Sprint
```
Use the Jira MCP tool to get the current sprint information
```

### Search for Specific Issues
```
Search for issues with JQL: "project = TUTORWISE AND status = 'In Progress'"
```

### Sync to Context Files
```
Sync current sprint and tickets to .ai/jira/ directory for persistent context
```

## Available Tools

1. **get_current_sprint** - Retrieve active sprint with all issues
2. **get_issue** - Get detailed information about specific ticket
3. **search_issues** - JQL-based issue searching
4. **sync_to_context** - Export Jira data to .ai/ context files

## File Structure After Sync

```
.ai/jira/
├── current-sprint.md       # Active sprint overview
├── project-overview.md     # Project summary and components
└── tickets/
    ├── TUTORWISE-1.md     # Individual ticket details
    ├── TUTORWISE-2.md
    └── ...
```

## Integration Benefits

- **Real-time Requirements**: Pull latest tickets into Claude Code context
- **Automated Context**: Sync sprint goals and acceptance criteria
- **Issue Tracking**: Link development work to specific Jira tickets
- **Project Visibility**: Understand current priorities and blockers

## Testing the Integration

1. Compile TypeScript: `npx tsc .ai/integrations/jira-mcp-server.ts`
2. Test MCP server: `node .ai/integrations/jira-mcp-server.js`
3. Use Claude Code tools to interact with Jira
4. Verify context files are generated in `.ai/jira/`