# Quick How-To: Remote Task Scheduling for Claude Code

**Schedule tasks from anywhere using Calendar or Jira - executed automatically every 10 minutes**

## 🚀 Quick Start (2 Minutes)

### **Method 1: Google Calendar (Easiest)**

1. **Open your Google Calendar** (mobile or web)
2. **Create new event:**
   - **Title:** Any name (e.g., "Create test file")
   - **Start time:** When you want it executed
   - **Description:** `Claude Code: Create "test.md" in docs folder. Write Hello World!`
3. **Save event**
4. **Wait:** Claude Code polls every 10 minutes and executes

### **Method 2: Jira Ticket (Project Integrated)**

1. **Create Jira ticket** in TUTOR project
2. **Set custom field:**
   - **Start time:** When you want it executed
3. **Add description:** `Claude Code: Create "test.md" in docs folder. Write Hello World!`
4. **Save ticket**
5. **Wait:** Claude Code polls every 10 minutes and executes

## 📱 Mobile Quick Guide

### **From Phone Calendar:**
```
📅 New Event
   Title: Create documentation
   Time: 2:00 PM today
   Description: Claude Code: Create "meeting-notes.md" in docs/meetings folder. Write Notes from client call.
   Save ✓
```

### **From Jira Mobile:**
```
🎫 New Ticket
   Summary: Create documentation
   Start time: 2:00 PM today
   Description: Claude Code: Create "meeting-notes.md" in docs/meetings folder. Write Notes from client call.
   Save ✓
```

## ⚡ Task Format Examples

### **File Creation:**
```
Claude Code: Create "filename.md" in docs/folder-name folder. Write Your content here!
```

### **Real Examples:**
```
Claude Code: Create "todo.md" in docs/planning folder. Write Project tasks for next week.

Claude Code: Create "summary.md" in docs/reports folder. Write Weekly status update.

Claude Code: Create "notes.md" in docs/meetings folder. Write Meeting with client about requirements.
```

## 🔧 System Commands

### **Test Everything Works:**
```bash
npm run calendar:test-tasks    # Show calendar events
npm run jira:test-tasks       # Show Jira tickets
```

### **Manual Execution (Test):**
```bash
npm run calendar:poll         # Execute calendar tasks now
npm run jira:poll            # Execute Jira tasks now
```

### **Start Automatic Monitoring:**
```bash
npm run calendar:poll:continuous    # Monitor calendar every 10 min
npm run jira:poll:continuous       # Monitor Jira every 10 min
```

## 📋 What Happens

### **Calendar Method:**
1. ✅ **Detects:** Calendar event with "Claude Code:" in description
2. ✅ **Executes:** Task when start time arrives (±15 min window)
3. ✅ **Logs:** Results to `logs/calendar-task-execution.log`
4. ✅ **Tracks:** Prevents duplicate execution

### **Jira Method:**
1. ✅ **Detects:** Jira ticket with start time custom field set
2. ✅ **Executes:** Task when start time arrives (±15 min window)
3. ✅ **Comments:** Results back to original Jira ticket
4. ✅ **Tracks:** Prevents duplicate execution

## 🎯 Pro Tips

### **For Success:**
- ✅ Use exact format: `Claude Code: [task]`
- ✅ Put quotes around filenames: `"test.md"`
- ✅ Specify folder clearly: `docs/folder-name folder`
- ✅ Set realistic execution times

### **For Mobile:**
- 📱 Use calendar app shortcuts
- 📱 Copy/paste task format from notes
- 📱 Set reminders 15 min before execution
- 📱 Check execution logs later

### **For Teams:**
- 👥 Use shared calendars for team tasks
- 👥 Create Jira tickets in appropriate projects
- 👥 Use clear task descriptions
- 👥 Set appropriate start times across timezones

## 🔍 Verification

### **Check if Task Executed:**

**Calendar Method:**
```bash
# Check execution log
cat logs/calendar-task-execution.log

# Check if file was created
ls docs/your-folder/
```

**Jira Method:**
```bash
# Check Jira ticket comments
# Look for "Task Executed by Claude Code" comment

# Check if file was created
ls docs/your-folder/
```

## ⚠️ Important Notes

- **Polling Interval:** 10 minutes (tasks execute within 15 min of start time)
- **Supported Tasks:** File creation (more types coming)
- **File Locations:** Relative to project root
- **Permissions:** Ensure write access to target folders
- **Duplicates:** System prevents re-execution of same task

## 🆘 Troubleshooting

### **Task Not Executing:**
1. Check format: `Claude Code: [exact format]`
2. Verify time window (±15 min from start)
3. Test connection: `npm run calendar:test-tasks`
4. Check logs: `logs/calendar-task-execution.log`

### **File Not Created:**
1. Check folder path exists: `ls docs/folder-name/`
2. Verify permissions: `ls -la docs/`
3. Check filename format: `"filename.md"` with quotes

### **No Response:**
1. Ensure polling is running: `npm run calendar:poll:continuous`
2. Check environment variables are set
3. Test manual execution: `npm run calendar:poll`

---

**🎉 You're all set! Schedule tasks from anywhere and let Claude Code handle them automatically.**