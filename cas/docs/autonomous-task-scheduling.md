# Autonomous Task Scheduling - Dual Method Setup

**Control Claude Code remotely via Calendar events or Jira tickets**

## 🎯 Overview

You now have **two independent methods** to schedule tasks for Claude Code when you're away from your computer:

1. **📅 Google Calendar Method** - Direct execution from calendar events
2. **🎫 Jira Ticket Method** - Execution from Jira tickets with custom fields

Both methods poll every 10 minutes and execute tasks automatically.

## 🚀 Method 1: Google Calendar Task Scheduling

### **How It Works:**
1. Create calendar event with start time
2. Add "Claude Code: [task]" in event description
3. System polls calendar every 10 minutes
4. Executes task when start time arrives
5. Logs execution to `logs/calendar-task-execution.log`

### **Calendar Event Format:**
```
Event Title: Any title you want
Start Time: When you want task executed
Description: Claude Code: Create "filename.md" in docs/folder. Write Hello World!
```

### **Commands:**
```bash
# Test calendar connection and show events
npm run calendar:test-tasks

# One-time poll for calendar tasks
npm run calendar:poll

# Continuous polling every 10 minutes
npm run calendar:poll:continuous
```

### **Benefits:**
- ✅ No Jira access needed
- ✅ Quick mobile calendar creation
- ✅ Visual timeline in calendar
- ✅ Execution logs preserved

## 🎫 Method 2: Jira Ticket Task Scheduling

### **How It Works:**
1. Create Jira ticket in TUTOR project
2. Set "Start time" custom field to execution time
3. Add "Claude Code: [task]" in ticket description
4. System polls Jira every 10 minutes
5. Executes task and comments back to ticket

### **Jira Ticket Format:**
```
Summary: Any title you want
Start time: [Custom field] Set to execution datetime
Description: Claude Code: Create "filename.md" in docs/folder. Write Hello World!
```

### **Commands:**
```bash
# Test Jira connection and show scheduled tickets
npm run jira:test-tasks

# One-time poll for Jira tasks
npm run jira:poll

# Continuous polling every 10 minutes
npm run jira:poll:continuous
```

### **Benefits:**
- ✅ Full project integration
- ✅ Task tracking in project workflow
- ✅ Automatic status updates
- ✅ Ticket comments for execution results

## 📝 Supported Task Types

### **File Creation Tasks:**
```
Claude Code: Create "test.md" in docs/testing folder. Write Hello World!
Claude Code: Create "notes.md" in docs/meeting-notes folder. Write Meeting summary from today.
```

### **Future Task Types (Expandable):**
- Documentation updates
- Code generation
- Data processing
- Report generation

## ⚙️ System Configuration

### **Polling Settings:**
- **Interval:** 10 minutes
- **Time Window:** 15 minutes (tasks execute if within 15 min of start time)
- **Tracking:** Prevents duplicate execution

### **Required Environment Variables:**
```bash
# For Calendar Method
GOOGLE_SERVICE_ACCOUNT_PATH=./google-credentials.json
GOOGLE_CALENDAR_IDS=primary,your-other-calendar

# For Jira Method
JIRA_BASE_URL=https://tutorwise.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your_api_token
JIRA_PROJECT_KEY=TUTOR
```

## 🔄 Running Both Methods Simultaneously

You can run both methods at the same time for maximum flexibility:

```bash
# Terminal 1: Calendar polling
npm run calendar:poll:continuous

# Terminal 2: Jira polling
npm run jira:poll:continuous
```

Or create separate screen/tmux sessions for each.

## 📊 Execution Tracking

### **Calendar Method:**
- **Log File:** `logs/calendar-task-execution.log`
- **Format:** Timestamped entries with task details
- **No calendar feedback** (read-only calendar access)

### **Jira Method:**
- **Jira Comments:** Added to original ticket
- **Status Updates:** Execution success/failure
- **Full Integration:** Part of project workflow

## 🛠️ Troubleshooting

### **Calendar Issues:**
```bash
# Test calendar access
npm run calendar:test-tasks

# Check service account permissions
# Verify GOOGLE_CALENDAR_IDS setting
```

### **Jira Issues:**
```bash
# Test Jira access
npm run jira:test-tasks

# Verify custom fields exist
# Check API token permissions
```

### **Task Parsing Issues:**
- Ensure exact format: "Claude Code: [task]"
- Check quotes around filenames
- Verify folder paths exist

## 🎯 Best Practices

### **For Calendar Method:**
1. Use clear event titles for identification
2. Set realistic time windows
3. Check execution logs regularly
4. Use recurring events for repeated tasks

### **For Jira Method:**
1. Create tickets in advance
2. Use meaningful ticket summaries
3. Set appropriate priority levels
4. Monitor ticket comments for results

### **General:**
1. Test tasks during office hours first
2. Use simple file creation tasks initially
3. Gradually expand to complex operations
4. Keep task descriptions clear and specific

## 🚀 Getting Started

### **Quick Setup:**
1. **Test connections:**
   ```bash
   npm run calendar:test-tasks
   npm run jira:test-tasks
   ```

2. **Create a test task:**
   - Calendar: Event with "Claude Code: Create "test.md" in docs folder. Write Test!"
   - Jira: Ticket with start time and same description

3. **Run one-time polls:**
   ```bash
   npm run calendar:poll
   npm run jira:poll
   ```

4. **Start continuous monitoring:**
   ```bash
   npm run calendar:poll:continuous &
   npm run jira:poll:continuous &
   ```

**You now have full autonomous task scheduling from anywhere!** 🤖✨