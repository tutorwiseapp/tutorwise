#!/bin/bash
# TutorWise direnv Auto-Startup Setup Script
# Installs and configures direnv for automatic CAS startup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TutorWise CAS Auto-Startup Setup         ║${NC}"
echo -e "${BLUE}║  Using direnv for automatic management    ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Step 1: Check if direnv is installed
echo -e "${BLUE}📦 Step 1: Checking direnv installation...${NC}"
if command -v direnv >/dev/null 2>&1; then
  echo -e "${GREEN}✅ direnv already installed: $(direnv version)${NC}"
else
  echo -e "${YELLOW}⚠️  direnv not found. Installing...${NC}"
  if command -v brew >/dev/null 2>&1; then
    brew install direnv
    echo -e "${GREEN}✅ direnv installed successfully${NC}"
  else
    echo -e "${RED}❌ Homebrew not found. Please install direnv manually:${NC}"
    echo -e "   Visit: https://direnv.net/docs/installation.html"
    exit 1
  fi
fi

# Step 2: Detect shell and add hook
echo -e "\n${BLUE}🐚 Step 2: Configuring shell integration...${NC}"

SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ]; then
  SHELL_CONFIG="$HOME/.zshrc"
  HOOK_LINE='eval "$(direnv hook zsh)"'
elif [ -n "$BASH_VERSION" ]; then
  SHELL_CONFIG="$HOME/.bashrc"
  HOOK_LINE='eval "$(direnv hook bash)"'
else
  echo -e "${RED}❌ Unknown shell. Please add direnv hook manually.${NC}"
  exit 1
fi

if [ -f "$SHELL_CONFIG" ]; then
  if grep -q "direnv hook" "$SHELL_CONFIG"; then
    echo -e "${GREEN}✅ direnv hook already configured in $SHELL_CONFIG${NC}"
  else
    echo -e "${YELLOW}Adding direnv hook to $SHELL_CONFIG...${NC}"
    echo "" >> "$SHELL_CONFIG"
    echo "# direnv hook for auto-loading project environments" >> "$SHELL_CONFIG"
    echo "$HOOK_LINE" >> "$SHELL_CONFIG"
    echo -e "${GREEN}✅ direnv hook added to $SHELL_CONFIG${NC}"
  fi
else
  echo -e "${RED}❌ Shell config file not found: $SHELL_CONFIG${NC}"
  exit 1
fi

# Step 3: Create .envrc file
echo -e "\n${BLUE}📝 Step 3: Creating .envrc configuration...${NC}"

if [ -f ".envrc" ]; then
  echo -e "${GREEN}✅ .envrc already exists${NC}"
else
  echo -e "${RED}❌ .envrc not found. This should have been created already.${NC}"
  exit 1
fi

# Step 4: Allow .envrc
echo -e "\n${BLUE}🔐 Step 4: Authorizing .envrc...${NC}"
direnv allow .

echo -e "${GREEN}✅ .envrc authorized${NC}"

# Step 5: Test configuration
echo -e "\n${BLUE}🧪 Step 5: Testing configuration...${NC}"

# Reload shell environment
eval "$HOOK_LINE"

echo -e "${GREEN}✅ direnv configured successfully!${NC}"

# Show summary
echo -e "\n${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Setup Complete! 🎉               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 What happens now:${NC}"
echo -e "  1. When you ${GREEN}cd${NC} into this project, CAS auto-starts"
echo -e "  2. Failed services retry ${GREEN}3 times${NC} with ${GREEN}5-second${NC} delays"
echo -e "  3. Desktop alerts notify you of status"
echo -e "  4. Health checks ensure all services running"
echo ""
echo -e "${YELLOW}🔧 Features:${NC}"
echo -e "  • ${GREEN}Automatic retry${NC} on failure (3 attempts)"
echo -e "  • ${GREEN}Health monitoring${NC} for core services"
echo -e "  • ${GREEN}Desktop notifications${NC} (macOS)"
echo -e "  • ${GREEN}Detailed error reporting${NC}"
echo -e "  • ${GREEN}Manual recovery options${NC}"
echo ""
echo -e "${YELLOW}📊 Useful commands:${NC}"
echo -e "  ${GREEN}cas-status${NC}   - Check all services"
echo -e "  ${GREEN}cas-restart${NC}  - Restart all services"
echo -e "  ${GREEN}cas-logs${NC}     - View service logs"
echo -e "  ${GREEN}cas-health${NC}   - Check health endpoint"
echo ""
echo -e "${YELLOW}⚙️  Next steps:${NC}"
echo -e "  1. ${BLUE}Restart your terminal${NC} (or run: ${GREEN}source $SHELL_CONFIG${NC})"
echo -e "  2. ${BLUE}cd${NC} out and back into this directory to test"
echo -e "  3. Watch for auto-startup and notifications"
echo ""
echo -e "${YELLOW}🚫 To disable:${NC}"
echo -e "  Run: ${GREEN}direnv deny${NC} (temporary)"
echo -e "  Or delete: ${GREEN}.envrc${NC} (permanent)"
echo ""
