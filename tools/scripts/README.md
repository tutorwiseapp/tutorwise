# Tools Scripts Organization

**Organized scripts by functional category for better maintainability**

## 📁 Folder Structure

### **🔗 integrations/**
Scripts that sync data between external services and the project:
- `confluence-sync.js` - Sync documentation to Confluence with auto Jira tickets
- `google-docs-sync.js` - Sync documentation to Google Docs
- `google-calendar-sync-to-jira.js` - Sync Google Calendar events to create Jira tickets

### **🤖 automation/**
Scripts that provide autonomous task execution capabilities:
- `jira-task-executor.js` - Poll Jira tickets and execute Claude Code tasks
- `google-calendar-task-executor.js` - Poll Google Calendar events and execute Claude Code tasks
- `google-calendar-service.sh` - Google Calendar service management utilities

### **🧪 testing/**
Scripts for testing various system components and integrations:
- `test-jira-fields.js` - Test Jira custom fields integration
- `test-role-comprehensive.js` - Comprehensive role management testing
- `test-role-management.js` - Role management functionality tests
- `test-role-simple.js` - Simple role management tests

### **🛠️ utilities/**
General utility scripts for various tasks:
- `screenshot.js` - General screenshot capture utility
- `screenshot-homepage.js` - Homepage screenshot capture
- `screenshot-tabs.js` - Multiple tab screenshot capture

## 🚀 Usage Patterns

### **Integration Scripts (Daily/Weekly)**
```bash
# Documentation sync
npm run sync:confluence
npm run sync:google-docs

# Google Calendar integration
npm run sync:google-calendar-to-jira
```

### **Automation Scripts (Continuous)**
```bash
# Autonomous task execution
npm run jira:poll:continuous
npm run google-calendar:poll:continuous
```

### **Testing Scripts (Development)**
```bash
# Integration testing
npm run test:jira-fields
npm run test:confluence
npm run test:google

# Role management testing
npm run test:role-management
```

### **Utility Scripts (As Needed)**
```bash
# Screenshots and utilities
npm run screenshot:homepage
npm run screenshot:tabs
```

## 📋 Script Categories by Function

### **Data Flow: External → Internal**
- `integrations/confluence-sync.js`
- `integrations/google-docs-sync.js`
- `integrations/google-calendar-sync-to-jira.js`

### **Task Execution: Scheduled → Automated**
- `automation/jira-task-executor.js`
- `automation/google-calendar-task-executor.js`

### **Quality Assurance: Validation → Testing**
- `testing/test-jira-fields.js`
- `testing/test-role-*.js`

### **Support Functions: Helper → Utility**
- `utilities/screenshot*.js`

## 🔄 Adding New Scripts

### **Integration Scripts → integrations/**
For scripts that sync/connect external services:
- API integrations (Slack, Teams, etc.)
- Data import/export tools
- Service connectors

### **Automation Scripts → automation/**
For scripts that execute tasks autonomously:
- Scheduled task runners
- Event-driven automation
- Workflow engines

### **Testing Scripts → testing/**
For scripts that validate functionality:
- Integration tests
- Component tests
- End-to-end validation

### **Utility Scripts → utilities/**
For general-purpose helper scripts:
- File processing
- Data transformation
- System utilities

## 📚 Related Documentation

- **Package Scripts:** `docs/reference/npm-scripts-reference.md`
- **Task Automation:** `docs/tools/autonomous-task-scheduling.md`
- **Integration Guide:** `docs/tools/context-engineering-implementation.md`
- **Quick How-To:** `docs/tools/remote-task-scheduling-howto.md`

---

*This organization supports scalable script management as the project grows.*