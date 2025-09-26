# Gemini CLI Configuration

This folder contains configuration files for the Tutorwise Gemini CLI, an AI-powered development assistant.

## Files

### `settings.json`
Base configuration file for the Gemini CLI. This file is tracked in version control and contains default settings that work for all team members.

### `settings.local.json` (gitignored)
Local override configuration file. Create this file to customize settings for your local environment. This file is automatically excluded from version control.

### `config.template.env`
Template for environment variables needed by the Gemini CLI. Copy the contents to your `.env.local` file and fill in your API keys.

### `README.md`
This documentation file.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   pip install google-generativeai
   ```

2. **Configure API Keys**
   Copy the template to your environment file:
   ```bash
   # Add the contents of config.template.env to your .env.local file
   echo "GOOGLE_AI_API_KEY=your_actual_api_key" >> .env.local
   ```

3. **Test Installation**
   ```bash
   python .ai/scripts/gemini-cli.py --help
   ```

## Configuration Options

### Model Settings
- `model.name`: Gemini model to use (default: "gemini-1.5-pro-latest")
- `model.temperature`: Creativity level (0.0-1.0, default: 0.1)
- `model.maxTokens`: Maximum response length (default: 8192)

### Context Sources
- `context.sources`: Which context files to include
- `context.maxContextLength`: Maximum context length
- `context.prioritySources`: Priority order for context loading

### Command Configuration
- `commands.chat.enabled`: Enable chat functionality
- `commands.analyze.enabled`: Enable ticket analysis
- `commands.review.enabled`: Enable code review
- `commands.debug.enabled`: Enable debug assistance
- `commands.plan.enabled`: Enable planning insights

### Integration Settings
- `integrations.jira.enabled`: Enable Jira integration
- `integrations.github.enabled`: Enable GitHub integration
- `integrations.calendar.enabled`: Enable Calendar integration

## Local Customization

Create a `settings.local.json` file to override any settings:

```json
{
  "model": {
    "temperature": 0.2
  },
  "context": {
    "sources": {
      "calendar": false
    }
  },
  "output": {
    "colorOutput": false
  }
}
```

## API Keys

### Required
- **GOOGLE_AI_API_KEY**: Get from https://makersuite.google.com/app/apikey

### Optional (for full functionality)
- **JIRA_API_TOKEN**: Get from Jira account settings
- **GITHUB_TOKEN**: Get from GitHub developer settings
- **GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY**: For Google services

## Usage Examples

```bash
# Interactive mode
python .ai/scripts/gemini-cli.py interactive

# Direct commands
python .ai/scripts/gemini-cli.py chat -q "How to implement role switching?"
python .ai/scripts/gemini-cli.py analyze -t TUTOR-25
python .ai/scripts/gemini-cli.py review -q "Review my authentication code"

# Using NPM scripts (recommended)
npm run gemini:chat -- -q "Your question"
npm run gemini:analyze -- -t TICKET-ID
npm run gemini:review -- -q "Review description"
```

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   ```
   Error: GOOGLE_AI_API_KEY environment variable not set
   ```
   Solution: Add your API key to `.env.local`

2. **Context Files Missing**
   ```
   Warning: Could not load context files
   ```
   Solution: Run `npm run sync:context` to generate context files

3. **Permission Denied**
   ```
   Permission denied: .ai/scripts/gemini-cli.py
   ```
   Solution: Make the script executable: `chmod +x .ai/scripts/gemini-cli.py`

### Debug Commands

```bash
# Check environment variables
echo $GOOGLE_AI_API_KEY

# Test context loading
python .ai/scripts/gemini-cli.py chat -q "test"

# Validate configuration
python -c "import json; print(json.load(open('.gemini/settings.json')))"
```

## Security Notes

- Never commit API keys to version control
- Use `.env.local` for sensitive environment variables
- The `settings.local.json` file is automatically gitignored
- Rotate API keys regularly for security

## Support

For issues with the Gemini CLI:
1. Check this README for common solutions
2. Verify your API keys are correct
3. Ensure all dependencies are installed
4. Run context sync if context-related errors occur