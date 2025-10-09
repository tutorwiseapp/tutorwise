# Tutorwise Automation Guide

## Overview

Tutorwise implements a comprehensive automation system that enables remote task execution through multiple channels. This system allows you to schedule and execute tasks when you're away from your computer using three different methods.

## Task Execution Methods

### Method 1: Direct Jira Task Execution
Poll Jira tickets with scheduled start times and execute Claude Code tasks automatically.

**How it works:**
- Creates Jira tickets with custom "Start time" field
- Polls every 10 minutes for tickets with start times
- Parses task instructions from ticket descriptions
- Executes tasks and updates tickets with results

**Use case:** Schedule tasks through your existing Jira workflow with precise timing control.

### Method 2: Hybrid Calendar-to-Jira Sync
Sync Google Calendar events to Jira tickets, then execute via Method 1.

**How it works:**
- Monitors Google Calendar for events with specific patterns
- Creates corresponding Jira tickets automatically
- Tasks execute via the Jira polling system
- Provides audit trail through Jira tickets

**Use case:** Schedule tasks naturally through Google Calendar while maintaining Jira tracking.

### Method 3: Direct Calendar Task Execution
Execute tasks directly from Google Calendar events without creating Jira tickets.

**How it works:**
- Polls Google Calendar events directly
- Executes tasks immediately when events start
- Logs execution to local files
- No Jira ticket creation

**Use case:** Quick task execution with minimal overhead and direct calendar scheduling.

## Recommended Ticket Format

For optimal clarity and professional appearance, use this format:

### Summary Field
```
[Claude Code] Brief description of task
[Gemini CLI] Brief description of task
```

### Description Field
```
Claude Code: Specific task instruction

Results: Expected outcome description
```

**Example Ticket:**
- **Summary**: `[Claude Code] Install Express Package`
- **Description**:
  ```
  Claude Code: Install the express package using npm.

  Results: The express package is installed and available for use in the project.
  ```

## Professional Task Format

The system uses a standardized professional format for all task descriptions:

### Supported Task Types

The system intelligently detects and executes different types of tasks:

#### 1. File Creation

**Format:**
```
Summary: [Claude Code] Create Monthly Report
Description:
Claude Code: Create "report.md" in docs/reports folder. Write monthly status report with metrics and analysis.

Results: Monthly report file is created with comprehensive metrics and analysis.
```

**Elements:**
- Filename in quotes with extension
- Relative path from project root
- Content description

#### 2. Package Installation

**Format:**
```
Summary: [Claude Code] Install Lodash Package
Description:
Claude Code: Install the lodash package using npm.

Results: The lodash package is installed and available for use in the project.
```

**Elements:**
- Package name to install
- Package manager (npm, yarn, pip)
- Installation outcome

#### 3. Command Execution

**Format:**
```
Summary: [Claude Code] Run Tests
Description:
Claude Code: Run the test command.

Results: All tests are executed and results are displayed.
```

**Elements:**
- Command to execute
- Expected execution outcome

## Script Organization

Scripts are organized in the `tools/scripts/` directory:

```
tools/scripts/
├── integrations/          # External service integrations
│   ├── sync-confluence.js
│   ├── sync-google-docs.js
│   └── sync-calendar-to-jira.js
├── automation/            # Task execution systems
│   ├── jira-task-executor.js
│   └── calendar-task-executor.js
├── testing/              # Testing and validation
│   └── test-jira-fields.js
└── utilities/            # Helper scripts
```

## Environment Configuration

Required environment variables in `.env.local`:

```bash
# Jira Configuration
JIRA_BASE_URL=https://tutorwise.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-token
JIRA_PROJECT_KEY=TUTOR

# Google Services Configuration
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
GOOGLE_CALENDAR_IDS=primary,secondary@example.com
GOOGLE_DOCS_FOLDER_IDS=folder1,folder2

# Confluence Configuration
CONFLUENCE_SPACE_KEY=TUTORWISE
```

## Custom Fields

Jira custom fields used by the automation system:

- **Start time** (`customfield_10092`): When to execute the task
- **End time** (`customfield_10093`): Expected completion time

## Available Commands

### Integration Commands
```bash
# Confluence sync
npm run sync:confluence
npm run test:confluence

# Google Docs sync
npm run sync:google-docs
npm run test:google

# Calendar operations
npm run sync:calendar
npm run test:calendar

# Calendar-to-Jira sync
npm run sync:calendar-to-jira
npm run sync:calendar-to-jira:continuous
npm run test:calendar-to-jira

# Combined operations
npm run sync:all
```

### Automation Commands
```bash
# Jira task execution
npm run jira:poll                    # One-time poll
npm run jira:poll:continuous         # Continuous polling
npm run jira:test-tasks             # Test and show tasks

# Calendar task execution
npm run calendar:poll               # One-time poll
npm run calendar:poll:continuous    # Continuous polling
npm run calendar:test-tasks         # Test and show events
```

### Testing Commands
```bash
# Jira field validation
npm run test:jira-fields

# Service connectivity tests
npm run test:confluence
npm run test:google
npm run test:calendar
npm run test:calendar-to-jira
```

## Usage Examples

### Example 1: Schedule File Creation via Jira

1. Create a Jira ticket (e.g., TUTOR-33)
2. Set the "Start time" custom field to your desired execution time
3. Add task description:
   ```
   Claude Code: Create "meeting-notes.md" in docs/meetings folder. Write Meeting notes template with agenda and action items.
   ```
4. Start polling: `npm run jira:poll:continuous`

### Example 2: Schedule via Google Calendar

1. Create a calendar event at your desired time
2. Add to event description:
   ```
   Claude Code: Create "daily-report.md" in docs/reports folder. Write Daily status report template.
   ```
3. Start polling: `npm run calendar:poll:continuous`

### Example 3: Hybrid Calendar-to-Jira

1. Create a calendar event with the pattern above
2. Run: `npm run sync:calendar-to-jira:continuous`
3. System creates Jira ticket automatically
4. Task executes via Jira polling system

## Logging and Monitoring

### Jira Method
- Comments added to Jira tickets with execution status
- Error details logged to ticket comments
- Full audit trail in Jira

### Calendar Method
- Execution logs written to `logs/calendar-task-execution.log`
- Success and error details captured
- Local file-based tracking

### Monitoring Commands
```bash
# Check for scheduled tasks
npm run jira:test-tasks
npm run calendar:test-tasks

# Monitor logs
tail -f logs/calendar-task-execution.log
```

## Security Considerations

- Service account credentials stored in `.env.local` (excluded from git)
- API tokens use least-privilege access
- Tasks execute in sandboxed environment
- All task execution logged for audit

## Troubleshooting

### Common Issues

1. **Authentication failures**
   - Verify `.env.local` configuration
   - Check service account permissions
   - Test connectivity with test commands

2. **Task not executing**
   - Verify task format matches expected pattern
   - Check polling is active
   - Review logs for errors

3. **Jira custom fields not found**
   - Run `npm run test:jira-fields` to validate field IDs
   - Update configuration if field IDs changed

### Debug Commands
```bash
# Test all integrations
npm run test:confluence
npm run test:google
npm run test:calendar-to-jira

# Validate task detection
npm run jira:test-tasks
npm run calendar:test-tasks
```

## Extending the System

### Adding New Task Types

1. Update task parsing regex in both executors
2. Add new execution handler methods
3. Update documentation with new format
4. Test with both Jira and Calendar methods

### Adding New Integrations

1. Create new script in `tools/scripts/integrations/`
2. Add npm script commands to `package.json`
3. Update environment configuration
4. Add testing and documentation

This automation system provides flexible, reliable remote task execution while maintaining full audit trails and error handling.