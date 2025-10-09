#!/bin/bash
set -e

echo "🏥 TutorWise Health Check"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    local cmd=$1
    local name=$2

    if command -v "$cmd" &> /dev/null; then
        echo -e "✅ ${GREEN}$name${NC}: $($cmd --version 2>/dev/null || echo "installed")"
    else
        echo -e "❌ ${RED}$name${NC}: Not installed"
        return 1
    fi
}

check_auth() {
    local cmd=$1
    local name=$2

    if $cmd &> /dev/null; then
        echo -e "✅ ${GREEN}$name${NC}: Authenticated"
    else
        echo -e "❌ ${RED}$name${NC}: Not authenticated"
        return 1
    fi
}

echo ""
echo "CLI Tools:"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "git" "Git"
check_command "vercel" "Vercel CLI"
check_command "railway" "Railway CLI"
check_command "supabase" "Supabase CLI"
check_command "percy" "Percy CLI"

echo ""
echo "Testing Tools:"
if npx playwright --version &> /dev/null; then
    echo -e "✅ ${GREEN}Playwright${NC}: $(npx playwright --version)"
else
    echo -e "❌ ${RED}Playwright${NC}: Not installed"
fi

if npx jest --version &> /dev/null; then
    echo -e "✅ ${GREEN}Jest${NC}: $(npx jest --version)"
else
    echo -e "❌ ${RED}Jest${NC}: Not installed"
fi

echo ""
echo "Authentication Status:"
check_auth "vercel whoami" "Vercel"
check_auth "railway whoami" "Railway"

# Check Supabase auth
if supabase projects list &> /dev/null 2>&1; then
    echo -e "✅ ${GREEN}Supabase${NC}: Authenticated"
else
    echo -e "❌ ${RED}Supabase${NC}: Not authenticated"
fi

# Check Percy token
if [[ -n "${PERCY_TOKEN}" ]]; then
    echo -e "✅ ${GREEN}Percy${NC}: Token configured"
else
    echo -e "⚠️  ${YELLOW}Percy${NC}: Token not set"
fi

echo ""
echo "📊 Project Status:"

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📍 Project Root: $(pwd)"
echo "🌿 Git Branch: $(git branch --show-current)"
echo "📝 Last Commit: $(git log -1 --oneline)"

# Check if on main branch and up to date
if [[ $(git branch --show-current) == "main" ]]; then
    echo -e "✅ ${GREEN}On main branch${NC}"
else
    echo -e "⚠️  ${YELLOW}Not on main branch${NC}"
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "⚠️  ${YELLOW}Uncommitted changes detected${NC}"
    git status --short
else
    echo -e "✅ ${GREEN}Working directory clean${NC}"
fi

echo ""
echo "🏗️ Build Health:"
cd apps/web

if npm run build &> /dev/null; then
    echo -e "✅ ${GREEN}Build successful${NC}"
else
    echo -e "❌ ${RED}Build failed${NC}"
fi

echo ""
echo "🎯 Integration Health Check Complete!"