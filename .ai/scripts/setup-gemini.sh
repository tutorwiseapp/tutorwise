#!/bin/bash

# Gemini CLI Setup Script for Tutorwise
# Installs dependencies and configures environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo -e "${BLUE}🤖 Setting up Gemini CLI for Tutorwise${NC}"
echo ""

# Check Python installation
echo -e "${YELLOW}🐍 Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✅ Found Python $PYTHON_VERSION${NC}"

# Check pip installation
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is not installed. Please install pip3.${NC}"
    exit 1
fi

# Install required Python packages
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip3 install --user google-generativeai python-dotenv

# Verify installations
echo -e "${YELLOW}🔍 Verifying installations...${NC}"
python3 -c "import google.generativeai as genai; print('✅ google-generativeai installed')"
python3 -c "import dotenv; print('✅ python-dotenv installed')"

# Check for environment file
ENV_FILE="$PROJECT_ROOT/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}📝 Creating .env.local file template...${NC}"
    cat > "$ENV_FILE" << 'EOF'
# Gemini AI Configuration
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Jira Configuration (optional)
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token

# GitHub Configuration (optional)
GITHUB_TOKEN=your_github_token

# Google Services (optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
EOF
    echo -e "${GREEN}✅ Created .env.local template${NC}"
else
    echo -e "${GREEN}✅ .env.local file already exists${NC}"
fi

# Make scripts executable
echo -e "${YELLOW}🔧 Making scripts executable...${NC}"
chmod +x "$SCRIPT_DIR/gemini-workflow.sh"
chmod +x "$SCRIPT_DIR/gemini-cli.py"

# Test basic functionality
echo -e "${YELLOW}🧪 Testing basic functionality...${NC}"
cd "$PROJECT_ROOT"

if [ -n "$GOOGLE_AI_API_KEY" ]; then
    echo -e "${GREEN}✅ GOOGLE_AI_API_KEY found in environment${NC}"
    echo -e "${BLUE}🧪 Testing Gemini CLI...${NC}"

    # Test CLI loads without errors
    if python3 "$SCRIPT_DIR/gemini-cli.py" --help > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Gemini CLI loads successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Gemini CLI loads but may need API key configuration${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  GOOGLE_AI_API_KEY not set. Please configure in .env.local${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Gemini CLI setup completed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Get your Gemini API key from: https://makersuite.google.com/app/apikey"
echo "2. Add it to .env.local: GOOGLE_AI_API_KEY=your_key_here"
echo "3. Run the CLI: npm run gemini"
echo ""
echo -e "${BLUE}Usage examples:${NC}"
echo "  npm run gemini                    # Interactive menu"
echo "  npm run gemini:interactive        # Direct interactive mode"
echo "  npm run gemini:plan              # Generate development plan"
echo "  npm run ai:gemini                # Sync context + interactive"
echo ""
echo -e "${BLUE}Direct CLI usage:${NC}"
echo "  ./.ai/scripts/gemini-cli.py chat -q \"How to add tests?\""
echo "  ./.ai/scripts/gemini-cli.py analyze -t TUTOR-20"
echo "  ./.ai/scripts/gemini-cli.py --interactive"
echo ""