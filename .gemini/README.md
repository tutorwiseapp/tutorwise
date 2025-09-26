# Gemini CLI Configuration

This directory contains configuration files for the Tutorwise Gemini CLI integration.

## Files

### settings.json
Base configuration settings for Gemini CLI behavior, context sources, and command defaults.

**Key Settings:**
- Model configuration (gemini-pro)
- Context source enablement
- Command-specific behaviors
- Output formatting preferences

### settings.local.json
Local development overrides with enhanced features and debug options.

**Enhanced Features:**
- Higher token limits
- Extended context ranges
- Debug mode capabilities
- Custom prompts and shortcuts

### config.template.env
Template for environment variables needed by Gemini CLI.

**Usage:**
1. Copy contents to project root `.env.local`
2. Fill in your API keys and configuration
3. Customize optional settings as needed

## Configuration Hierarchy

Settings are loaded in this order (later overrides earlier):
1. `settings.json` - Base settings
2. `settings.local.json` - Local overrides
3. Environment variables - Runtime overrides

## Environment Variable Overrides

You can override any setting using environment variables with the `GEMINI_` prefix:

```bash
GEMINI_MODEL=gemini-pro-vision
GEMINI_TEMPERATURE=0.9
GEMINI_CONTEXT_MODE=minimal
GEMINI_STREAMING=false
```

## Context Source Configuration

### Jira Integration
```json
{
  "enabled": true,
  "maxTickets": 30,
  "includeSubtasks": true,
  "includeComments": true
}
```

### GitHub Integration
```json
{
  "enabled": true,
  "maxIssues": 20,
  "maxPullRequests": 10,
  "includeLabels": true
}
```

### Calendar Integration
```json
{
  "enabled": true,
  "dayRange": 30,
  "includeAnalysis": true
}
```

## Command Configuration

Each command has specific default behaviors:

- **chat**: Quick interactions with minimal context
- **analyze**: Deep ticket analysis with full context
- **review**: Code review with security and performance checks
- **debug**: Error analysis with technical context
- **plan**: Strategic planning with sprint and calendar context

## Custom Prompts

Define specialized prompts for different use cases:

```json
{
  "customPrompts": {
    "codeReview": "Focus on security, performance, maintainability...",
    "ticketAnalysis": "Provide comprehensive analysis including...",
    "debugHelp": "Analyze the error in context of...",
    "planning": "Generate actionable development plan..."
  }
}
```

## Shortcuts

Pre-configured command combinations for common tasks:

```json
{
  "shortcuts": {
    "quickAnalysis": {
      "command": "analyze",
      "contextMode": "minimal",
      "focusAreas": ["implementation", "testing"]
    },
    "securityReview": {
      "command": "review",
      "contextMode": "full",
      "focusAreas": ["security", "authentication"]
    }
  }
}
```

## Performance Tuning

### Context Optimization
- **enableCaching**: Cache API responses to reduce latency
- **cacheTimeout**: How long to cache responses (seconds)
- **compressOldTickets**: Reduce context size for older tickets
- **prioritizeActiveWork**: Focus context on current sprint items

### Output Optimization
- **streamingEnabled**: Enable real-time response streaming
- **maxTokens**: Limit response length for faster generation
- **temperature**: Control response creativity (0.0-1.0)

## Development Mode

Local settings include debug features:

```json
{
  "development": {
    "enableDebugMode": true,
    "logRequests": false,
    "logResponses": false,
    "verboseOutput": true
  }
}
```

## Integration with CLI

The Gemini CLI automatically loads these settings:

1. Checks for `.gemini/settings.json`
2. Overlays `.gemini/settings.local.json` if present
3. Applies environment variable overrides
4. Validates required configurations

## Best Practices

### Security
- Never commit API keys to version control
- Use `.env.local` for sensitive configuration
- Regularly rotate API tokens
- Monitor API usage and costs

### Performance
- Use minimal context mode for quick questions
- Enable caching for repeated operations
- Adjust token limits based on use case
- Monitor response times and optimize settings

### Maintenance
- Review and update settings monthly
- Clean up old custom prompts
- Update API keys before expiration
- Test configuration changes in development

## Troubleshooting

### Common Issues

**Settings not loading:**
- Check JSON syntax in configuration files
- Verify file permissions
- Ensure files are in correct location

**Context too large:**
- Reduce maxTickets, maxIssues settings
- Enable compressOldTickets
- Use minimal context mode
- Adjust mainPrompt maxLength

**Slow responses:**
- Enable caching
- Reduce context sources
- Lower maxTokens limit
- Use streaming responses

**Authentication failures:**
- Verify API keys in `.env.local`
- Check service account permissions
- Validate environment variable loading

### Debug Commands

```bash
# Test configuration loading
python3 .ai/scripts/gemini-cli.py --help

# Validate settings
node -e "console.log(JSON.parse(require('fs').readFileSync('.gemini/settings.json')))"

# Check environment variables
echo $GOOGLE_AI_API_KEY
```

## Migration from Other AI Tools

If migrating from other AI CLI tools:

1. Export existing configurations
2. Map settings to Gemini CLI format
3. Test with minimal configuration first
4. Gradually enable additional features
5. Validate context quality and performance