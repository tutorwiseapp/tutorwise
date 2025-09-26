# Gemini CLI Integration for Tutorwise

## Overview

The Gemini CLI integration provides AI-powered assistance for Tutorwise development using Google's Gemini AI model with full project context awareness. It integrates seamlessly with your existing context engineering system, including Jira tickets, GitHub data, calendar events, and project documentation.

## Features

- **Context-Aware AI**: Automatically loads project context from `.ai/` directory
- **Multiple Interaction Modes**: Interactive chat, command-line operations, and specialized workflows
- **Jira Integration**: Analyze tickets, get implementation recommendations
- **Code Review**: Context-aware code analysis and suggestions
- **Debug Assistance**: Help with troubleshooting using project knowledge
- **Development Planning**: Generate plans based on current sprint and roadmap
- **Flexible Context**: Full or minimal context modes for different use cases

## Setup

### 1. Install Dependencies

Run the setup script to install Python dependencies:

```bash
./.ai/scripts/setup-gemini.sh
```

This will:
- Check Python 3.8+ installation
- Install required packages (`google-generativeai`, `python-dotenv`)
- Create `.env.local` template if it doesn't exist
- Make scripts executable

### 2. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file:

```bash
# In .env.local
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

### 3. Verify Installation

Test the CLI loads correctly:

```bash
npm run gemini:interactive
```

## Usage

### NPM Scripts (Recommended)

```bash
# Interactive menu with all options
npm run gemini

# Direct commands
npm run gemini:interactive    # Interactive chat mode
npm run gemini:plan          # Generate development plan
npm run gemini:chat -- -q "How to add tests?"
npm run gemini:analyze -- -t TUTOR-20
npm run gemini:review -- -q "Review my authentication code"
npm run gemini:debug -- -q "Getting 404 errors on API routes"

# Sync context first, then start interactive mode
npm run ai:gemini
```

### Direct CLI Usage

```bash
# Interactive mode
./.ai/scripts/gemini-cli.py --interactive

# Quick questions
./.ai/scripts/gemini-cli.py chat -q "How to implement user roles?"

# Analyze Jira tickets
./.ai/scripts/gemini-cli.py analyze -t TUTOR-20

# Code review
./.ai/scripts/gemini-cli.py review -q "Review my payment integration code"

# Debug help
./.ai/scripts/gemini-cli.py debug -q "Supabase RLS policies not working"

# Development planning
./.ai/scripts/gemini-cli.py plan

# Minimal context for quick questions
./.ai/scripts/gemini-cli.py chat -q "What's the Next.js app router?" --minimal

# Streaming responses
./.ai/scripts/gemini-cli.py chat -q "Explain the project architecture" --stream
```

### Workflow Script Features

The `gemini-workflow.sh` script provides an interactive menu:

```bash
./.ai/scripts/gemini-workflow.sh
```

Menu options:
1. **Interactive Chat** - Full conversational interface
2. **Analyze Jira Ticket** - Deep analysis of specific tickets
3. **Code Review** - Context-aware code analysis
4. **Debug Help** - Troubleshooting assistance
5. **Development Planning** - Strategic planning based on context
6. **Quick Question** - Fast answers with minimal context
7. **Sync Context & Chat** - Refresh all context data first
8. **Custom Command** - Execute any CLI command

## Context Integration

### Automatic Context Loading

The CLI automatically loads:

- **Main Context**: Project overview from `.ai/PROMPT.md`
- **Jira Tickets**: Current sprint and individual ticket details
- **GitHub Data**: Repository overview, issues, PRs
- **Calendar Events**: Development schedule and milestones
- **Figma Designs**: Design system and UI specifications
- **Google Docs**: Project documentation
- **Mermaid Diagrams**: System architecture and flows

### Context Modes

**Full Context Mode** (default):
- Loads complete project context (up to 3000 chars from main prompt)
- Includes recent Jira tickets with summaries
- Provides development schedule
- Best for complex queries and implementation planning

**Minimal Context Mode** (`--minimal`):
- Basic project description only
- Faster responses
- Best for quick questions and general guidance

## Example Workflows

### 1. Ticket Analysis and Implementation

```bash
# Analyze a specific ticket
npm run gemini:analyze -- -t TUTOR-20

# Get implementation recommendations
./.ai/scripts/gemini-cli.py analyze -t TUTOR-20
```

### 2. Code Review Process

```bash
# Review specific implementation
npm run gemini:review -- -q "Review my Stripe webhook handler for security"

# Review with streaming output
./.ai/scripts/gemini-cli.py review -q "Check my authentication middleware" --stream
```

### 3. Debug Session

```bash
# Get help with errors
npm run gemini:debug -- -q "Users can't log in, getting JWT invalid errors"

# Interactive debugging
./.ai/scripts/gemini-cli.py debug -q "Payment webhooks failing in production"
```

### 4. Sprint Planning

```bash
# Generate development plan based on current context
npm run gemini:plan

# Plan with fresh context
npm run ai:gemini
# Then select option 5 (Development Planning)
```

### 5. Quick Development Questions

```bash
# Fast answers without full context
npm run gemini:chat -- -q "How to add TypeScript types?" --minimal

# Quick architecture questions
./.ai/scripts/gemini-cli.py chat -q "Best practice for Supabase RLS?" --minimal
```

## Advanced Usage

### Custom Context Queries

```bash
# Focus on specific context areas
./.ai/scripts/gemini-cli.py chat -q "Based on current Jira tickets, what should I work on next?"

# Architecture-focused queries
./.ai/scripts/gemini-cli.py chat -q "How does the payment system integrate with user roles?"
```

### Streaming Responses

```bash
# Stream long responses for better UX
./.ai/scripts/gemini-cli.py chat -q "Explain the entire project architecture" --stream
```

### Integration with Development Workflow

```bash
# Sync context and get AI assistance
npm run sync:context && npm run gemini:interactive

# Full context refresh and planning
npm run ai:gemini
```

## Configuration

### Configuration Directory

Gemini CLI uses a `.gemini/` directory for configuration management:

```
.gemini/
├── settings.json           # Base configuration (version controlled)
├── settings.local.json     # Local overrides (ignored by git)
├── config.template.env     # Environment variable template
└── README.md              # Configuration documentation
```

### Configuration Hierarchy

Settings are loaded in order (later overrides earlier):
1. `settings.json` - Base configuration
2. `settings.local.json` - Local development overrides
3. Environment variables - Runtime overrides (GEMINI_* prefix)

### Environment Variables

#### Required

```bash
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

#### Optional Configuration Overrides

```bash
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=4096
GEMINI_CONTEXT_MODE=full
GEMINI_STREAMING=true
```

### Optional (enhances context)

```bash
# Jira Integration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token

# GitHub Integration
GITHUB_TOKEN=your_github_token

# Google Services
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
```

## Troubleshooting

### Common Issues

**"GOOGLE_AI_API_KEY not found"**
- Ensure API key is set in `.env.local`
- Check the key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)

**"ModuleNotFoundError: No module named 'google.generativeai'"**
- Run the setup script: `./.ai/scripts/setup-gemini.sh`
- Or manually install: `pip3 install --user google-generativeai python-dotenv`

**Context loading issues**
- Ensure you're in the project root directory
- Check `.ai/` directory exists with context files
- Run `npm run sync:context` to refresh context data

**Permission denied on scripts**
- Make scripts executable: `chmod +x .ai/scripts/*.sh`

### Debug Mode

For detailed error information:

```bash
# Enable Python debug output
PYTHONPATH=.ai/scripts python3 -c "
import sys
import traceback
try:
    exec(open('.ai/scripts/gemini-cli.py').read())
except Exception as e:
    print(f'Error: {e}')
    traceback.print_exc()
"
```

## Integration with Other Tools

### VS Code Integration

Add to VS Code tasks (`.vscode/tasks.json`):

```json
{
  "label": "Gemini: Analyze Current Ticket",
  "type": "shell",
  "command": "npm",
  "args": ["run", "gemini:analyze", "--", "-t", "${input:ticketKey}"],
  "group": "build"
}
```

### Git Hooks

Add to pre-commit hook:

```bash
# Get AI review before committing
npm run gemini:review -- -q "Review staged changes for best practices"
```

## Best Practices

1. **Use appropriate context mode**: Full for implementation, minimal for quick questions
2. **Sync context regularly**: Run `npm run sync:context` when tickets change
3. **Be specific in queries**: Include relevant details for better responses
4. **Use streaming for long responses**: Add `--stream` for better UX
5. **Leverage specialized commands**: Use `analyze`, `review`, `debug` for focused help

## API Limits and Costs

- Gemini API has rate limits and usage costs
- Monitor usage at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Use minimal context mode for cost optimization
- Consider caching responses for repeated queries

## Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Review AI suggestions before implementing
- Validate security-related recommendations independently