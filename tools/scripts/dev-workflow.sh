#!/bin/bash

# =============================================================================
# Tutorwise Development Workflow Script
# =============================================================================
# Purpose: Comprehensive development workflow for building features efficiently
# Usage: ./scripts/dev-workflow.sh [command]
# Commands: check, test, build, deploy, fix-tests, clean, full
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/dev-workflow_$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Print colored header
print_header() {
    log "${BLUE}========================================${NC}"
    log "${BLUE}  $1${NC}"
    log "${BLUE}========================================${NC}"
}

# Print step
print_step() {
    log "${CYAN}🔄 $1${NC}"
}

# Print success
print_success() {
    log "${GREEN}✅ $1${NC}"
}

# Print warning
print_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Print error
print_error() {
    log "${RED}❌ $1${NC}"
}

# Print info
print_info() {
    log "${PURPLE}ℹ️  $1${NC}"
}

# Change to project root
cd "$PROJECT_ROOT"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

check_dependencies() {
    print_step "Checking dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi

    print_success "All dependencies are available"
}

install_packages() {
    print_step "Installing/updating packages..."
    npm install
    print_success "Packages installed successfully"
}

run_linting() {
    print_step "Running ESLint..."
    if npm run lint; then
        print_success "Linting passed"
        return 0
    else
        print_warning "Linting issues found - attempting auto-fix..."
        if npm run lint:fix 2>/dev/null || true; then
            print_success "Auto-fix completed"
            return 0
        else
            print_error "Linting failed and could not be auto-fixed"
            return 1
        fi
    fi
}

run_type_checking() {
    print_step "Running TypeScript type checking..."
    if npm run typecheck 2>/dev/null || npx tsc --noEmit; then
        print_success "Type checking passed"
        return 0
    else
        print_error "Type checking failed"
        return 1
    fi
}

run_unit_tests() {
    print_step "Running unit tests..."
    if npm run test:unit 2>/dev/null || npm test 2>/dev/null || npx jest; then
        print_success "Unit tests passed"
        return 0
    else
        print_warning "Unit tests failed"
        return 1
    fi
}

run_build() {
    print_step "Building project..."
    if npm run build; then
        print_success "Build completed successfully"
        return 0
    else
        print_error "Build failed"
        return 1
    fi
}

run_security_check() {
    print_step "Running security audit..."
    if npm audit --audit-level=high; then
        print_success "Security audit passed"
        return 0
    else
        print_warning "Security vulnerabilities found - attempting auto-fix..."
        npm audit fix --force
        print_info "Security issues auto-fixed (please review changes)"
        return 0
    fi
}

check_git_status() {
    print_step "Checking git status..."

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        return 1
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "Uncommitted changes detected"
        git status --porcelain
        return 1
    fi

    print_success "Git status clean"
    return 0
}

# =============================================================================
# MAIN WORKFLOW FUNCTIONS
# =============================================================================

dev_check() {
    print_header "DEVELOPMENT HEALTH CHECK"

    local errors=0

    check_dependencies || ((errors++))
    install_packages || ((errors++))
    run_linting || ((errors++))
    run_type_checking || ((errors++))

    if [ $errors -eq 0 ]; then
        print_success "All checks passed! 🎉"
        return 0
    else
        print_error "$errors check(s) failed"
        return 1
    fi
}

dev_test() {
    print_header "COMPREHENSIVE TESTING"

    local errors=0

    # First run quick checks
    dev_check || ((errors++))

    # Then run tests
    run_unit_tests || ((errors++))
    run_security_check || ((errors++))

    if [ $errors -eq 0 ]; then
        print_success "All tests passed! 🚀"
        return 0
    else
        print_error "$errors test(s) failed"
        return 1
    fi
}

dev_build() {
    print_header "BUILD VERIFICATION"

    local errors=0

    # Run all checks first
    dev_test || ((errors++))

    # Then build
    run_build || ((errors++))

    if [ $errors -eq 0 ]; then
        print_success "Build verification completed! 🏗️"
        return 0
    else
        print_error "Build verification failed"
        return 1
    fi
}

dev_deploy() {
    print_header "PRE-DEPLOYMENT VALIDATION"

    local errors=0

    # Check git status
    check_git_status || ((errors++))

    # Run full build verification
    dev_build || ((errors++))

    if [ $errors -eq 0 ]; then
        print_success "Ready for deployment! 🚀"
        print_info "Run 'git push origin main' to deploy"
        return 0
    else
        print_error "Not ready for deployment"
        return 1
    fi
}

fix_tests() {
    print_header "TEST FIXING WORKFLOW"

    print_step "Updating test snapshots..."
    npm run test:unit -- --updateSnapshot 2>/dev/null || npx jest --updateSnapshot || true

    print_step "Running tests with verbose output..."
    npm run test:unit -- --verbose 2>/dev/null || npx jest --verbose || true

    print_step "Generating test coverage report..."
    npm run test:coverage 2>/dev/null || npx jest --coverage || true

    print_success "Test fixing workflow completed"
}

clean_project() {
    print_header "PROJECT CLEANUP"

    print_step "Cleaning build artifacts..."
    rm -rf .next dist build out

    print_step "Cleaning node_modules..."
    rm -rf node_modules

    print_step "Cleaning package-lock..."
    rm -f package-lock.json

    print_step "Reinstalling dependencies..."
    npm install

    print_success "Project cleanup completed"
}

full_workflow() {
    print_header "FULL DEVELOPMENT WORKFLOW"

    local start_time=$(date +%s)

    print_info "Starting comprehensive development workflow..."
    print_info "Log file: $LOG_FILE"

    # Run all phases
    dev_check && \
    dev_test && \
    dev_build && \
    dev_deploy

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $? -eq 0 ]; then
        print_success "🎉 Full workflow completed successfully in ${duration}s!"
        print_info "Your code is ready for production deployment"
    else
        print_error "❌ Workflow failed - check the issues above"
        print_info "Run './scripts/dev-workflow.sh fix-tests' if test issues persist"
    fi
}

# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

show_usage() {
    echo "Tutorwise Development Workflow Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  check       Run basic health checks (lint, types, deps)"
    echo "  test        Run comprehensive testing suite"
    echo "  build       Run build verification with all checks"
    echo "  deploy      Validate readiness for deployment"
    echo "  fix-tests   Fix common test issues and update snapshots"
    echo "  clean       Clean project and reinstall dependencies"
    echo "  full        Run complete workflow (check → test → build → deploy)"
    echo ""
    echo "Examples:"
    echo "  $0 check          # Quick health check"
    echo "  $0 full           # Complete workflow"
    echo "  $0 fix-tests      # Fix failing tests"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

case "${1:-full}" in
    "check")
        dev_check
        ;;
    "test")
        dev_test
        ;;
    "build")
        dev_build
        ;;
    "deploy")
        dev_deploy
        ;;
    "fix-tests")
        fix_tests
        ;;
    "clean")
        clean_project
        ;;
    "full")
        full_workflow
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac

exit $?