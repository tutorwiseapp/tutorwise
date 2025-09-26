# Claude Code Configuration

This folder contains configuration files for Claude Code, providing AI-powered development assistance within the Tutorwise project.

## Files

### `settings.json`
Base configuration file for Claude Code. This file is tracked in version control and contains default permissions and settings that work for all team members.

### `settings.local.json`
Local override configuration file. Create this file to customize settings for your local environment. This file allows you to modify permissions and add personal preferences.

### `config.template.json`
Template for additional Claude Code configuration options. Use this as a reference for advanced configuration.

### `README.md`
This documentation file.

## Configuration Structure

### Permissions System

Claude Code uses a permission system to control which tools and commands can be executed:

```json
{
  "permissions": {
    "allow": [
      "Read(///**)",
      "Bash(npm run:*)",
      "Bash(git:*)"
    ],
    "deny": [
      "Bash(rm:*)",
      "Bash(sudo:*)"
    ],
    "ask": [
      "Bash(npm install:*)"
    ]
  }
}
```

### Permission Categories

- **allow**: Commands that can be executed without asking
- **deny**: Commands that are explicitly blocked
- **ask**: Commands that require user confirmation

### Pattern Matching

- `*` matches any characters within a segment
- `**` matches any characters including path separators
- `Bash(command:*)` matches bash commands starting with "command"
- `Read(///**)` matches reading any file in the project

## Default Permissions

The base configuration includes permissions for:

### Development Commands
- `npm run:*` - NPM scripts
- `npm test:*` - Testing commands
- `npm run build:*` - Build commands
- `npm run lint:*` - Linting commands

### Git Operations
- `git add:*` - Adding files to git
- `git commit:*` - Committing changes
- `git push:*` - Pushing to remote
- `git log:*` - Viewing git history

### File Operations
- `Read(///**)` - Reading any project file
- Safe bash commands for development

### Testing and Quality
- `npm run test:*` - All test commands
- `npx playwright:*` - End-to-end testing
- `python3 -m pytest:*` - Python testing

## Local Customization

Create a `settings.local.json` file to override permissions or add new ones:

```json
{
  "permissions": {
    "allow": [
      "Bash(docker:*)",
      "Bash(make:*)"
    ],
    "ask": [
      "Bash(pip install:*)"
    ]
  }
}
```

## Security Considerations

### Safe Commands
- File reading operations
- Standard development tools (npm, git, linting)
- Testing frameworks
- Build tools

### Restricted Commands
- System administration commands (sudo, rm -rf)
- Network operations that could expose data
- File operations outside the project directory

### Best Practices
1. Only allow commands you understand
2. Use specific patterns rather than broad wildcards
3. Put potentially dangerous commands in "ask" category
4. Regularly review and update permissions

## Common Patterns

### Web Development
```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(yarn:*)",
      "Bash(npx:*)",
      "Bash(node:*)"
    ]
  }
}
```

### Python Development
```json
{
  "permissions": {
    "allow": [
      "Bash(python3:*)",
      "Bash(pip:*)",
      "Bash(pytest:*)"
    ]
  }
}
```

### Database Operations
```json
{
  "permissions": {
    "ask": [
      "Bash(psql:*)",
      "Bash(mysql:*)",
      "Bash(redis-cli:*)"
    ]
  }
}
```

## Troubleshooting

### Command Blocked
If Claude Code says a command is blocked:
1. Check if it's in the "deny" list
2. Add it to "allow" if it's safe
3. Consider adding to "ask" for confirmation

### Permission Errors
```
Error: Command not permitted
```
Solution: Add the command pattern to your permissions

### File Access Issues
```
Error: Cannot read file
```
Solution: Ensure `Read(///**)` is in your allow list

## Integration with Tutorwise

The configuration is tailored for Tutorwise development:

### Specific Permissions
- AI integration scripts
- Database migration tools
- Testing frameworks
- Build and deployment tools

### Context Awareness
- Integrates with project structure
- Supports role-based development
- Enables AI-powered code assistance

## Updates and Maintenance

### Version Control
- `settings.json` is tracked in git
- `settings.local.json` is gitignored
- Update base settings for team-wide changes

### Regular Reviews
- Audit permissions quarterly
- Remove unused command patterns
- Add new development tools as needed

## Support

For Claude Code configuration issues:
1. Check this README for guidance
2. Review the permission patterns
3. Test with minimal permissions first
4. Gradually add more as needed