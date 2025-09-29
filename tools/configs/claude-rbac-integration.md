# Claude Code RBAC Integration Guide

## Purpose
This document explains how Claude Code assistant integrates with the RBAC permission system to ensure safe operation within the Tutorwise project.

## Integration Points

### 1. Before High-Risk Operations
Claude Code will automatically check permissions before:
- Database deletions or schema changes
- Production environment modifications
- Infrastructure changes
- Security-related operations

### 2. Permission Check Process
```bash
# Example: Before running a database migration
node tools/scripts/utilities/check-claude-permissions.js "ALTER production database" production

# Exit codes:
# 0 = Allowed, proceed
# 1 = Forbidden, do not proceed
# 2 = Requires approval, ask user first
```

### 3. Built-in Safety Measures
Claude Code will:
- ✅ Always ask for approval before forbidden operations
- ✅ Clearly state when operations require user permission
- ✅ Refuse to perform forbidden actions automatically
- ✅ Provide clear explanations for permission decisions

## Permission Categories

### ✅ ALLOWED (Green Light)
- Code development and editing
- Creating database tables and functions
- Running tests and development scripts
- Documentation updates
- Development environment changes

### ⚠️ REQUIRES APPROVAL (Yellow Light)
- Production database schema changes
- Merging to main branch
- Modifying production configurations
- Removing major dependencies

### 🚫 FORBIDDEN (Red Light)
- Deleting databases or instances
- Removing user data
- Modifying authentication settings
- Deleting critical system files

## How to Grant Approval

When Claude requests approval:

1. **Review the proposed action** and its impact
2. **Check the reason** for requiring approval
3. **Grant permission explicitly**: "Yes, you can proceed with X"
4. **Or deny permission**: "No, do not proceed with X"

## Emergency Procedures

### If Claude attempts forbidden action:
- User can immediately revoke all permissions
- All database changes must be reversible
- Contact project owner for escalation

### Override Process:
1. User explicitly grants permission: "Override RBAC, proceed with X"
2. Claude will document the override and proceed with extra caution
3. All overrides are logged for audit purposes

## Example Interactions

### ✅ Safe Operation
```
Claude: "I'm going to create a new table for user preferences. Checking permissions..."
Permission Check: ✅ ALLOWED
Claude: "Permission confirmed. Creating table now."
```

### ⚠️ Approval Required
```
Claude: "I need to modify the production database schema. Checking permissions..."
Permission Check: ⚠️ REQUIRES APPROVAL - Risk of breaking production application
Claude: "This operation requires your approval. May I proceed with altering the production schema?"
User: "Yes, proceed carefully"
Claude: "Thank you. Proceeding with extra safety measures..."
```

### 🚫 Forbidden Operation
```
Claude: "I was asked to delete the database. Checking permissions..."
Permission Check: 🚫 FORBIDDEN - Cannot delete entire databases or instances
Claude: "I cannot delete the database as this is forbidden by RBAC. This would require explicit override permission."
```

## Updating Permissions

To modify Claude's permissions:

1. Edit `tools/configs/claude-rbac-permissions.yml`
2. Test changes with `check-claude-permissions.js`
3. Inform Claude of permission changes
4. Document changes in version history

## Monitoring and Auditing

- All permission checks are logged
- High-risk operations trigger notifications
- Failed permission attempts are recorded
- Regular reviews of permission usage recommended

---

*This RBAC system ensures Claude Code operates safely while maintaining development productivity.*