#!/bin/bash

# =============================================================================
# Tutorwise Development Environment Setup
# =============================================================================
# Purpose: One-click setup for new developers
# Usage: ./scripts/setup-dev-env.sh
# =============================================================================

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Print functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

print_header "TUTORWISE DEVELOPMENT ENVIRONMENT SETUP"

# Check system requirements
print_step "Checking system requirements..."

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION detected"
else
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION detected"
else
    print_error "npm is not installed"
    exit 1
fi

# Check git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    print_success "$GIT_VERSION detected"
else
    print_error "Git is not installed"
    exit 1
fi

# Install dependencies
print_step "Installing project dependencies..."
npm install
print_success "Dependencies installed"

# Setup environment files using smart sync
print_step "Setting up environment configuration..."
if [ -f "tools/scripts/setup/sync-env.sh" ]; then
    chmod +x tools/scripts/setup/sync-env.sh
    ./tools/scripts/setup/sync-env.sh
else
    # Fallback to simple copy if sync script doesn't exist
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_success "Created .env.local from template"
            print_warning "Please update .env.local with your actual environment variables"
        else
            print_warning ".env.example not found - you may need to create .env.local manually"
        fi
    else
        print_success ".env.local already exists"
    fi
fi

# Setup git hooks
print_step "Setting up git hooks..."
if [ -d ".husky" ]; then
    npx husky install
    print_success "Git hooks configured"
else
    print_warning "Husky not configured - git hooks may not be active"
fi

# Run initial health check
print_step "Running initial health check..."
chmod +x scripts/dev-workflow.sh
if ./scripts/dev-workflow.sh check; then
    print_success "Development environment is ready!"
else
    print_error "Initial health check failed - please review the errors above"
    exit 1
fi

# Create useful aliases
print_step "Creating development aliases..."
cat > .dev-aliases.sh << 'EOF'
#!/bin/bash
# Tutorwise Development Aliases
# Source this file: source .dev-aliases.sh

alias tw-check='npm run workflow:check'
alias tw-test='npm run workflow:test'
alias tw-build='npm run workflow:build'
alias tw-deploy='npm run workflow:deploy'
alias tw-full='npm run workflow:full'
alias tw-fix='npm run workflow:fix-tests'
alias tw-clean='npm run workflow:clean'
alias tw-dev='npm run dev'
alias tw-logs='tail -f logs/*.log'

echo "🚀 Tutorwise development aliases loaded!"
echo "Available commands:"
echo "  tw-check   - Quick health check"
echo "  tw-test    - Run tests"
echo "  tw-build   - Build verification"
echo "  tw-deploy  - Deployment readiness"
echo "  tw-full    - Complete workflow"
echo "  tw-fix     - Fix tests"
echo "  tw-clean   - Clean project"
echo "  tw-dev     - Start dev server"
echo "  tw-logs    - View logs"
EOF

chmod +x .dev-aliases.sh
print_success "Development aliases created (.dev-aliases.sh)"

# Final instructions
print_header "SETUP COMPLETE"

echo -e "${GREEN}🎉 Your Tutorwise development environment is ready!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review and update .env.local with your environment variables"
echo "2. Run 'source .dev-aliases.sh' to load helpful aliases"
echo "3. Start development with 'npm run dev' or 'tw-dev'"
echo "4. Run 'npm run workflow:full' before committing changes"
echo ""
echo -e "${BLUE}Quick commands:${NC}"
echo "  npm run dev               - Start development server"
echo "  npm run workflow:check    - Quick health check"
echo "  npm run workflow:full     - Complete development workflow"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  .ai/DEVELOPER-SETUP.md       - Complete setup guide"
echo "  .ai/QUICK-START.md           - 5-minute quick start"
echo "  docs/development/environment-setup.md - Daily workflow"
echo ""
echo -e "${BLUE}Need help?${NC}"
echo "  Run './scripts/dev-workflow.sh --help' for workflow options"
echo ""
print_success "Happy coding! 🚀"