# CAS Quick Start Guide

## 🚀 For Your Current Terminal (One-Time Setup)

Since you're already in the tutorwise folder, run **once**:

```bash
source ~/.zshrc
```

After this, you can immediately use:
- `cas-status` - Show what's running
- `cas-startup` - Interactive manager
- `cas-start` - Start all services
- `cas-stop` - Stop all services

## 🎯 For New Terminals (Automatic)

**Nothing to do!** Just:
```bash
cd ~/projects/tutorwise
```

CAS automatically:
- Loads environment variables
- Starts services if not running
- Activates all aliases

## 📋 Available Commands

| Command | What It Does |
|---------|-------------|
| `cas-status` | Show service status table |
| `cas-startup` | Interactive control menu |
| `cas-start` | Start all services |
| `cas-stop` | Stop all services |
| `cas-restart` | Restart all services |

## 🔧 How It Works

1. **Auto-startup via direnv**: When you `cd tutorwise/`, `.envrc` runs and starts CAS
2. **Direct executables**: `~/.local/bin/cas-*` scripts work from anywhere
3. **Shell aliases**: Defined in `~/.zshrc`, loaded automatically in new terminals

## ✅ What Was Fixed

- Added `direnv hook` to `.zshrc` for auto-startup
- Added `~/.local/bin` to PATH for direct commands
- Updated `cas-startup.sh` to auto-load direnv
- Created direct executables: `cas-startup`, `cas-status`

## 💡 Pro Tips

- **Quick check**: `cas-status` (shows table immediately)
- **Interactive mode**: `cas-startup` (full control menu)
- **Auto-start test**: Exit terminal, reopen, `cd tutorwise` (should auto-start)

## 🐛 Troubleshooting

If commands don't work:
```bash
# Reload shell config (one-time fix)
source ~/.zshrc

# Then test
cas-status
```

New terminals after this? **Everything just works!**
