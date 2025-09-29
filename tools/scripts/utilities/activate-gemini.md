# 🔷 How to Activate Gemini CLI

## ✅ Quick Activation

Your Gemini CLI is **already configured and ready**! Here's how to use it:

### **1. Interactive Mode (Recommended)**
```bash
npm run gemini
# or
npm run ai:gemini    # Includes context refresh
```

### **2. Direct Commands**
```bash
# Chat mode (quick questions)
npm run gemini:chat -- --query "How do I implement user authentication?"

# Analysis mode (deep analysis)
npm run gemini:analyze -- --ticket "TUTOR-123"

# Get help
npm run gemini:help
```

### **3. Direct Python Access**
```bash
# Interactive mode
python3 .ai/scripts/gemini-cli.py --interactive

# Quick query
python3 .ai/scripts/gemini-cli.py chat --query "Your question here" --minimal

# Analyze ticket
python3 .ai/scripts/gemini-cli.py analyze --ticket "TUTOR-123"
```

## 🔧 Configuration Status

✅ **API Key**: Available in `.env.local`
✅ **Configuration**: Set up in `.gemini/` directory
✅ **Context Integration**: Connected to project context
✅ **npm Scripts**: Added for easy access

## 🎯 Available Commands

| Command | Description | Usage |
|---------|-------------|--------|
| `chat` | Quick conversations | `--query "question"` |
| `analyze` | Deep ticket analysis | `--ticket "TUTOR-123"` |
| `review` | Code review assistance | `--query "review this code"` |
| `debug` | Error analysis | `--query "debug this error"` |
| `plan` | Strategic planning | `--query "plan next sprint"` |

## 🚀 Common Usage Patterns

### **Quick Question**
```bash
npm run gemini:chat -- --query "How do I add a new React component?"
```

### **Ticket Analysis**
```bash
npm run gemini:analyze -- --ticket "TUTOR-123"
```

### **Interactive Session**
```bash
npm run gemini
# Then type your questions interactively
```

### **With Fresh Context**
```bash
npm run ai:gemini
# Refreshes context maps, then starts Gemini
```

## 🔍 Environment Check

To verify everything is working:
```bash
# Check all integrations
node tools/scripts/utilities/test-integrations.js gemini

# Check environment
node tools/scripts/utilities/load-env.js
```

## 🛠️ Troubleshooting

**If Gemini CLI doesn't work:**

1. **Check Python dependencies:**
   ```bash
   pip3 install google-generativeai python-dotenv
   ```

2. **Verify API key:**
   ```bash
   node -e "require('./tools/scripts/utilities/load-env.js').checkStatus()"
   ```

3. **Test direct access:**
   ```bash
   python3 .ai/scripts/gemini-cli.py --help
   ```

**Common Issues:**
- **"CLI Error: can only concatenate str..."**: There's a minor bug in the CLI script, but basic functionality works
- **"API Key not found"**: Environment not loading properly, use the load-env utility
- **"Command not found"**: Use the npm scripts instead of direct python calls

## 💡 Pro Tips

1. **Use `--minimal` flag** for faster responses on simple questions
2. **Use `--stream` flag** for real-time response streaming
3. **Start with `npm run ai:gemini`** to ensure fresh context
4. **Use ticket analysis** for comprehensive feature planning

---

**Your Gemini CLI is ready to use! Start with `npm run gemini` for interactive mode.**