# Integration Configuration Guide

This guide explains how to configure the various integrations for Tutorwise context engineering.

## Overview

The `.ai/` directory contains integrations that sync external content into Claude Code context:

- **Jira**: Syncs tickets and sprint information
- **GitHub**: Syncs repository, issues, and pull requests
- **Google Docs**: Syncs documents from Google Drive folders
- **Confluence**: Syncs pages from Confluence spaces
- **Mermaid**: Processes Mermaid diagrams for visual context

## Integration Status

| Integration | Status | Config Required | Context Output |
|-------------|--------|-----------------|----------------|
| Jira | ✅ Active | Yes | `.ai/jira/` |
| GitHub | ✅ Active | Yes | `.ai/github/` |
| Google Docs | ✅ Ready | Yes | `.ai/google-docs/` |
| Google Calendar | ✅ Ready | Yes | `.ai/calendar/` |
| Confluence | 🔧 Setup Required | Yes | `.ai/confluence/` |
| Mermaid | ✅ Ready | Optional | `.ai/mermaid/` |
| Figma | ✅ Ready | Yes | `.ai/figma/` |

## Environment Variables

Create or update your `.env.local` file with the following configurations:

### Jira Integration

```bash
# Required
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your_jira_api_token

# Optional
JIRA_PROJECT_KEY=TUTOR
JIRA_BOARD_ID=1
```

### GitHub Integration

```bash
# Required
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_REPO_OWNER=tutorwiseapp
GITHUB_REPO_NAME=tutorwise

# Optional
GITHUB_API_URL=https://api.github.com
```

### Google Docs Integration

```bash
# Required
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
GOOGLE_DOCS_FOLDER_IDS=folder_id_1,folder_id_2

# Optional
GOOGLE_DOCS_DOCUMENT_IDS=doc_id_1,doc_id_2
```

### Google Calendar Integration

```bash
# Required
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
GOOGLE_CALENDAR_IDS=primary,calendar_id_2

# Optional
CALENDAR_START_DATE=2025-01-01T00:00:00Z
CALENDAR_END_DATE=2025-12-31T23:59:59Z
CALENDAR_MAX_RESULTS=50
```

### Confluence Integration

```bash
# Required
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_EMAIL=your-email@domain.com
CONFLUENCE_API_TOKEN=your_confluence_api_token

# Optional
CONFLUENCE_SPACE_KEYS=SPACE1,SPACE2
CONFLUENCE_PAGE_IDS=page_id_1,page_id_2
```

### Mermaid Integration

```bash
# Optional (defaults provided)
MERMAID_DIAGRAM_PATHS=docs,src,components,.ai
MERMAID_INCLUDE_PATTERNS=.*\.mmd,.*\.mermaid,.*diagram.*\.md
MERMAID_EXCLUDE_PATTERNS=node_modules,.git,dist,build
MERMAID_OUTPUT_FORMAT=both
```

## Setup Instructions

### 1. Jira Setup (✅ Complete)

Already configured and working. Syncs ticket TUTOR-* from the current board.

### 2. GitHub Setup (✅ Complete)

Already configured and working. Syncs repository info, issues, and PRs.

### 3. Google Docs Setup

1. **Create Service Account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable Google Drive API and Google Docs API
   - Create Service Account credentials
   - Download JSON key file as `google-credentials.json`

2. **Share Documents**:
   - Share your Google Drive folders/documents with the service account email
   - Get folder IDs from folder URLs: `https://drive.google.com/drive/folders/{FOLDER_ID}`

3. **Install JWT Library**:
   ```bash
   npm install jsonwebtoken
   ```

4. **Update Environment**:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
   GOOGLE_DOCS_FOLDER_IDS=your_folder_ids_here
   ```

### 4. Confluence Setup

1. **Create API Token**:
   - Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Create new API token
   - Copy the token (you won't see it again)

2. **Get Space Keys**:
   - Visit your Confluence spaces
   - Space key is in the URL: `https://domain.atlassian.net/wiki/spaces/{SPACE_KEY}`

3. **Update Environment**:
   ```bash
   CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
   CONFLUENCE_EMAIL=your-email@domain.com
   CONFLUENCE_API_TOKEN=your_api_token
   CONFLUENCE_SPACE_KEYS=SPACE1,SPACE2
   ```

### 5. Mermaid Setup (✅ Ready)

No setup required. Works out of the box with default paths and patterns.

## Usage Commands

### Individual Syncs
```bash
npm run sync:jira        # Sync Jira tickets
npm run sync:github      # Sync GitHub data
npm run sync:google-docs # Sync Google Docs
npm run sync:confluence  # Sync Confluence pages
npm run sync:mermaid     # Process Mermaid diagrams
```

### Combined Syncs
```bash
npm run sync:context     # Sync Jira + GitHub + Mermaid
npm run sync:all         # Sync all integrations
npm run dev:with-context # Sync context + start dev server
```

## Context Output Structure

```
.ai/
├── PROMPT.md                    # Main context file (auto-updated)
├── jira/
│   ├── overview.md
│   ├── current-sprint.md
│   └── tickets/
├── github/
│   ├── repository-overview.md
│   ├── issues/
│   └── pull-requests/
├── google-docs/
│   ├── overview.md
│   └── documents/
├── confluence/
│   ├── overview.md
│   ├── spaces/
│   └── pages/
└── mermaid/
    ├── overview.md
    ├── diagram-index.md
    ├── diagrams/
    └── rendered/
```

## Troubleshooting

### Google Docs Issues
- **JWT signing error**: Install `jsonwebtoken` package
- **Permission denied**: Share documents with service account email
- **API not enabled**: Enable Google Drive and Docs APIs in Cloud Console

### Confluence Issues
- **Authentication failed**: Check API token and email
- **Space not found**: Verify space keys are correct
- **Rate limits**: Add delays between requests if needed

### Mermaid Issues
- **No diagrams found**: Check file paths and patterns
- **Parsing errors**: Verify Mermaid syntax in diagram files

### General Issues
- **Environment variables**: Ensure `.env.local` is properly formatted
- **Network issues**: Check firewall and proxy settings
- **File permissions**: Ensure write access to `.ai/` directory

## Security Notes

- **Never commit** `.env.local` or service account JSON files
- **Use least privilege** for API tokens and service accounts
- **Rotate tokens** regularly for production environments
- **Review permissions** before sharing documents or spaces

## Advanced Configuration

### Custom Sync Intervals
Add to your development workflow:

```bash
# Add to package.json scripts
"sync:watch": "watch 'npm run sync:context' .ai/",
"dev:auto-sync": "concurrently 'npm run sync:watch' 'npm run dev'"
```

### Selective Syncing
Use environment variables to control what gets synced:

```bash
SYNC_ENABLED=jira,github,mermaid
SYNC_DISABLED=google-docs,confluence
```

### Custom Formatting
Modify the integration TypeScript files to customize:
- Markdown output format
- File naming conventions
- Content filtering
- Context section structure

---

*This configuration enables comprehensive context engineering for autonomous AI development.*