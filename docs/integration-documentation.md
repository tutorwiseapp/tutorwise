# Tutorwise Integration Documentation

## Overview

Tutorwise implements comprehensive integrations with external services to enable seamless documentation sync, task management, and automation workflows.

## Integration Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Google Docs   │    │   Confluence    │    │      Jira       │
│   Documentation │    │   Knowledge     │    │   Task Mgmt     │
│      Sync       │    │      Base       │    │   & Tracking    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Tutorwise      │
                    │  Claude Code    │
                    │  Automation     │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Google Calendar │
                    │ Task Scheduling │
                    └─────────────────┘
```

## Service Integrations

### Google Services Integration

**File:** `tools/scripts/integrations/sync-google-docs.js`

**Capabilities:**
- **Documentation Sync**: Converts markdown files to Google Docs with proper formatting
- **Calendar Polling**: Monitors Google Calendar for upcoming events
- **Folder Management**: Automatically creates and organizes folder structures

**Features:**
- Markdown to Google Docs conversion with headers, lists, code blocks
- Hierarchical folder creation based on directory structure
- Real-time calendar event monitoring
- Support for multiple calendar sources

**Usage:**
```bash
# Sync documentation to Google Docs
npm run sync:google-docs

# Poll calendar for events
npm run sync:calendar

# Test Google services connection
npm run test:google
npm run test:calendar
```

### Confluence Integration

**File:** `tools/scripts/integrations/sync-confluence.js`

**Capabilities:**
- **Knowledge Base Sync**: Uploads markdown documentation to Confluence spaces
- **Automatic Jira Ticket Creation**: Creates review tickets for new documentation
- **Space Management**: Ensures proper space and page hierarchy

**Features:**
- Markdown to Confluence storage format conversion
- Parent-child page relationships based on directory structure
- Automated review workflow through Jira ticket creation
- Support for code blocks, headers, lists, and links

**Jira Integration:**
- Creates "Documentation Review" tickets automatically
- Assigns proper labels: `['ai-generated', 'claude-code', 'documentation', 'auto-sync']`
- Sets appropriate priority and issue type
- Includes content preview and validation checklist

**Usage:**
```bash
# Sync to Confluence
npm run sync:confluence

# Test Confluence connection
npm run test:confluence

# Sync all documentation
npm run sync:all
```

### Calendar-to-Jira Sync

**File:** `tools/scripts/integrations/sync-calendar-to-jira.js`

**Capabilities:**
- **Event-to-Ticket Conversion**: Converts calendar events to Jira tickets
- **Task Instruction Parsing**: Extracts Claude Code instructions from event descriptions
- **Scheduling Integration**: Populates custom time fields for automation

**Features:**
- Monitors multiple calendar sources
- Creates tickets with proper project assignment
- Sets start/end time custom fields for automation
- Adds descriptive labels and assigns to Claude Code user

**Task Detection:**
Looks for events with descriptions containing:
```
Claude Code: [task instruction]
```

**Usage:**
```bash
# One-time sync
npm run sync:calendar-to-jira

# Continuous monitoring
npm run sync:calendar-to-jira:continuous

# Test calendar-to-Jira connection
npm run test:calendar-to-jira
```

## Documentation Sync Workflow

### 1. Local Documentation Structure
```
docs/
├── README.md                 # Project overview
├── architecture/
│   ├── README.md            # Architecture overview
│   ├── database-design.md   # Database documentation
│   └── api-design.md        # API documentation
├── features/
│   ├── user-management.md   # Feature documentation
│   └── analytics.md         # Analytics features
└── guides/
    ├── deployment.md        # Deployment guide
    └── development.md       # Development setup
```

### 2. Google Docs Sync Result
```
Tutorwise Documentation/     # Main folder
├── docs - Overview          # From docs/README.md
├── architecture/            # Subfolder
│   ├── architecture - Overview    # From architecture/README.md
│   ├── database-design            # From database-design.md
│   └── api-design                 # From api-design.md
├── features/                # Subfolder
│   ├── user-management           # From user-management.md
│   └── analytics                 # From analytics.md
└── guides/                  # Subfolder
    ├── deployment               # From deployment.md
    └── development              # From development.md
```

### 3. Confluence Sync Result
```
TUTORWISE Space
├── docs (Page)              # From docs/README.md
│   ├── architecture (Child) # From architecture/README.md
│   │   ├── database-design  # Child of architecture
│   │   └── api-design       # Child of architecture
│   ├── features (Child)     # README creates parent
│   │   ├── user-management  # Child of features
│   │   └── analytics        # Child of features
│   └── guides (Child)       # README creates parent
│       ├── deployment       # Child of guides
│       └── development      # Child of guides
```

## Automation Integration Points

### Custom Fields Integration

**Jira Custom Fields:**
- **Start time** (`customfield_10092`): When tasks should execute
- **End time** (`customfield_10093`): Expected completion time

**Usage in Integrations:**
```javascript
// Calendar-to-Jira sync sets these fields
[config.customFields.startTime]: event.start.dateTime,
[config.customFields.endTime]: event.end.dateTime
```

### Label-Based Tracking

**Standard Labels Applied:**
- `ai-generated`: Marks content created by AI
- `claude-code`: Identifies Claude Code as the creator
- `documentation`: Categorizes as documentation work
- `auto-sync`: Indicates automatic synchronization

### Cross-Service Event Flow

#### Documentation Update Flow
1. **Local Change**: Developer updates markdown file
2. **Google Sync**: `npm run sync:google-docs` updates Google Docs
3. **Confluence Sync**: `npm run sync:confluence` updates knowledge base
4. **Jira Ticket**: Automatically created for documentation review
5. **Automation**: Review task can be scheduled via calendar or Jira

#### Task Scheduling Flow
1. **Calendar Event**: User creates event with Claude Code instruction
2. **Jira Creation**: Calendar-to-Jira sync creates ticket
3. **Task Execution**: Jira polling system executes task
4. **Documentation**: Results can trigger documentation sync

## Error Handling and Logging

### Authentication Handling
- **Google Services**: JWT token validation with scope verification
- **Jira/Confluence**: Basic auth with API token validation
- **Graceful Degradation**: Continues operation if one service fails

### Logging Standards
```javascript
// Color-coded console logging
this.log('✅ Operation successful', 'green');
this.log('⚠️ Warning message', 'yellow');
this.log('❌ Error occurred', 'red');
this.log('📁 Info message', 'blue');
```

### Error Recovery
- **Connection Failures**: Automatic retry with exponential backoff
- **Partial Failures**: Continue processing other items
- **State Tracking**: Maintains execution state across restarts

## Configuration Management

### Environment Variables
```bash
# Service URLs and Authentication
JIRA_BASE_URL=https://tutorwise.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-token

# Google Services
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
GOOGLE_CALENDAR_IDS=primary,calendar2@example.com
GOOGLE_DOCS_FOLDER_IDS=folder1,folder2

# Project Configuration
JIRA_PROJECT_KEY=TUTOR
CONFLUENCE_SPACE_KEY=TUTORWISE
```

### Service Account Setup

**Google Service Account Permissions:**
- **Google Docs API**: Read/Write access to documents
- **Google Drive API**: Folder and file management
- **Google Calendar API**: Read access to calendar events

**Jira/Confluence Permissions:**
- **Project Access**: Create/edit tickets in specified project
- **Space Access**: Read/write access to Confluence space
- **Custom Field Access**: Read/write custom field values

## Testing and Validation

### Connection Testing
```bash
# Test individual services
npm run test:google         # Google Docs and Calendar
npm run test:confluence     # Confluence connectivity
npm run test:calendar-to-jira  # Calendar-Jira integration

# Test Jira configuration
npm run test:jira-fields    # Validate custom field IDs
```

### Integration Validation
```bash
# Test complete workflows
npm run sync:all           # Full documentation sync
npm run jira:test-tasks    # Show scheduled Jira tasks
npm run calendar:test-tasks # Show calendar events with tasks
```

### Debugging Tools
```bash
# Verbose logging for troubleshooting
DEBUG=true npm run sync:confluence
DEBUG=true npm run sync:google-docs

# Individual component testing
node tools/scripts/integrations/sync-confluence.js test
node tools/scripts/integrations/sync-google-docs.js test
```

## Security Considerations

### Credential Management
- All credentials stored in `.env.local` (git-ignored)
- Service accounts use minimal required permissions
- API tokens rotated regularly

### Data Protection
- No sensitive data in task descriptions
- Local file creation in controlled directories
- Audit logging for all external service calls

### Access Control
- Service account permissions reviewed quarterly
- Integration limited to designated spaces/projects
- Calendar access restricted to specified calendars

## Extending Integrations

### Adding New Services

1. **Create Integration Script**
   ```bash
   tools/scripts/integrations/sync-newservice.js
   ```

2. **Add npm Commands**
   ```json
   "sync:newservice": "node tools/scripts/integrations/sync-newservice.js",
   "test:newservice": "node tools/scripts/integrations/sync-newservice.js test"
   ```

3. **Update Documentation**
   - Add service to this document
   - Update automation guide if applicable
   - Create service-specific documentation

### Integration Best Practices

1. **Error Handling**: Implement comprehensive error recovery
2. **Logging**: Use consistent logging format with timestamps
3. **Configuration**: Externalize all service-specific settings
4. **Testing**: Provide test commands for connectivity validation
5. **Documentation**: Document all environment variables and permissions

This integration system provides a robust foundation for connecting Tutorwise with external services while maintaining security, reliability, and extensibility.