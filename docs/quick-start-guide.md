# Tutorwise Quick Start Guide

## Remote Task Execution - How To

This guide shows you how to schedule and execute tasks remotely using Tutorwise's automation system.

## Prerequisites

1. **Environment Setup**: Ensure `.env.local` is configured with your service credentials
2. **Dependencies**: Run `npm install` to install required packages
3. **Service Accounts**: Google service account JSON file in place

## Method 1: Jira Task Scheduling (Recommended)

### Step 1: Create a Jira Ticket
1. Go to your Jira project (e.g., TUTOR project)
2. Create a new ticket (Task or Story)
3. Set the **Summary** to: `[Claude Code] Brief task description`
4. Set the **Start time** custom field to when you want the task to execute
5. Add your task instruction to the **description**:

**Recommended Format:**
```
Claude Code: Install the express package using npm.

Results: The express package is installed and available for use in the project.
```

**Alternative Formats:**
```
[CLAUDE CODE]
TASK: CREATE_FILE
FILE: meeting-notes.md
PATH: docs/meetings
CONTENT: Meeting agenda template with action items section
```

### Step 2: Start the Polling System
```bash
# Start continuous polling (recommended for production)
npm run jira:poll:continuous

# Or one-time poll for testing
npm run jira:poll
```

### Step 3: Monitor Execution
- Check the Jira ticket for execution comments
- Task results will be posted as comments
- Files will be created in the specified location

**Example Ticket:**
- **Summary**: "Create meeting notes template"
- **Start time**: "2024-10-28 21:00"
- **Description**: "Claude Code: Create 'meeting-notes.md' in docs/meetings folder. Write Meeting agenda template with action items section."

## Method 2: Calendar Task Scheduling

### Step 1: Create Calendar Event
1. Open Google Calendar
2. Create an event at your desired execution time
3. Add task instruction to the event description using either format:

**Structured Format (Recommended):**
```
[CLAUDE CODE]
TASK: CREATE_FILE
FILE: daily-report.md
PATH: docs/reports
CONTENT: Daily status report template
```

**Conversational Format:**
```
Claude Code: Create "daily-report.md" in docs/reports folder. Write Daily status report template.
```

### Step 2: Start Calendar Polling
```bash
# Start continuous calendar polling
npm run calendar:poll:continuous

# Or one-time poll for testing
npm run calendar:poll
```

### Step 3: Monitor Execution
- Check the execution log: `logs/calendar-task-execution.log`
- Files will be created in the specified location
- No Jira ticket is created (direct execution)

## Method 3: Hybrid Calendar-to-Jira

### Step 1: Create Calendar Event (Same as Method 2)
1. Create calendar event with Claude Code instruction in description

### Step 2: Start Hybrid Sync
```bash
# Start calendar-to-Jira sync
npm run sync:calendar-to-jira:continuous
```

### Step 3: Start Jira Polling
```bash
# In another terminal, start Jira task execution
npm run jira:poll:continuous
```

### Result
- Calendar event automatically creates Jira ticket
- Jira system executes the task
- Full audit trail maintained in Jira

## Professional Task Format

The system uses a professional format for all AI tools:

### Format Structure
```
Summary: [Claude Code] Brief description of task
Description:
Claude Code: Specific task instruction

Results: Expected outcome description
```

### Supported Task Types

#### File Creation
```
Summary: [Claude Code] Create API Documentation
Description:
Claude Code: Create "api-documentation.md" in docs/api folder. Write API endpoint documentation with examples.

Results: API documentation file is created with comprehensive endpoint information.
```

#### Package Installation
```
Summary: [Claude Code] Install Express Package
Description:
Claude Code: Install the express package using npm.

Results: The express package is installed and available for use in the project.
```

#### Command Execution
```
Summary: [Claude Code] Run Build Command
Description:
Claude Code: Run the build command.

Results: The project is built successfully and ready for deployment.
```

## Testing Your Setup

### Test Service Connections
```bash
# Test all integrations
npm run test:google
npm run test:confluence
npm run test:calendar-to-jira

# Test Jira custom fields
npm run test:jira-fields
```

### Test Task Detection
```bash
# See what tasks are scheduled in Jira
npm run jira:test-tasks

# See what calendar events have tasks
npm run calendar:test-tasks
```

### Test Complete Workflow
1. Create a test Jira ticket with start time 5 minutes from now
2. Add description: `Claude Code: Create "test.md" in docs/testing folder. Write Hello World!`
3. Run: `npm run jira:poll`
4. Check if `docs/testing/test.md` was created

## Monitoring and Logs

### Jira Method Monitoring
- Execution status posted as Jira comments
- Error details in ticket comments
- Use Jira filters to track automated tasks

### Calendar Method Monitoring
```bash
# View execution log
tail -f logs/calendar-task-execution.log

# Check for recent executions
cat logs/calendar-task-execution.log | grep "$(date +%Y-%m-%d)"
```

### Real-time Monitoring
```bash
# Monitor Jira polling in real-time
npm run jira:poll:continuous

# Monitor calendar polling in real-time
npm run calendar:poll:continuous
```

## Common Use Cases

### 1. Daily Report Generation
**Schedule:** Every day at 5 PM
**Method:** Calendar event
**Task:** `Claude Code: Create "daily-report-YYYY-MM-DD.md" in docs/reports folder. Write daily status report template.`

### 2. Meeting Preparation
**Schedule:** 30 minutes before meeting
**Method:** Jira ticket
**Task:** `Claude Code: Create "meeting-prep.md" in docs/meetings folder. Write meeting preparation checklist.`

### 3. Documentation Updates
**Schedule:** After code deployment
**Method:** Hybrid (calendar creates Jira ticket)
**Task:** `Claude Code: Create "release-notes.md" in docs/releases folder. Write release notes template.`

## Troubleshooting

### Task Not Executing
1. **Check polling is running**: Look for polling messages in console
2. **Verify task format**: Ensure "Claude Code:" prefix is present
3. **Check permissions**: Run test commands to verify service access
4. **Review logs**: Check execution logs for errors

### Authentication Issues
1. **Update credentials**: Check `.env.local` file
2. **Test connections**: Run `npm run test:google` and `npm run test:confluence`
3. **Verify permissions**: Ensure service accounts have required access

### File Creation Issues
1. **Check paths**: Ensure directory paths exist or can be created
2. **Verify permissions**: Check write permissions to target directories
3. **Review syntax**: Ensure task format matches examples

## Quick Commands Reference

```bash
# Start Systems
npm run jira:poll:continuous          # Jira task polling
npm run calendar:poll:continuous      # Calendar task polling
npm run sync:calendar-to-jira:continuous  # Hybrid method

# Testing
npm run jira:test-tasks              # Show Jira tasks
npm run calendar:test-tasks          # Show calendar events
npm run test:jira-fields            # Validate Jira setup

# One-time Operations
npm run jira:poll                    # Single Jira poll
npm run calendar:poll                # Single calendar poll
npm run sync:calendar-to-jira        # Single calendar-to-Jira sync

# Documentation Sync
npm run sync:all                     # Sync all documentation
npm run sync:confluence              # Sync to Confluence only
npm run sync:google-docs             # Sync to Google Docs only
```

## Getting Help

### Debug Mode
Add `DEBUG=true` to any command for verbose logging:
```bash
DEBUG=true npm run jira:poll
```

### Log Files
- Calendar executions: `logs/calendar-task-execution.log`
- Console output for Jira executions
- Service connection logs in console

### Common Patterns
- **File naming**: Use descriptive names with proper extensions
- **Path specification**: Always relative to project root
- **Content description**: Be specific about what content to include
- **Scheduling**: Allow buffer time for system processing

You're now ready to schedule and execute remote tasks using the Tutorwise automation system!