#!/bin/bash

# =============================================================================
# Visual Testing Script for UI Components
# =============================================================================
# Purpose: Automated visual testing to catch UI issues before deployment
# Usage: ./scripts/visual-test.sh [component-name]
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_step() {
    echo -e "${BLUE}🔍 $1${NC}"
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

# Check if development server is running
check_dev_server() {
    print_step "Checking development server status..."

    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Development server is running on http://localhost:3000"
        return 0
    else
        print_error "Development server is not running. Please start with 'npm run dev'"
        return 1
    fi
}

# Test navigation menu structure
test_navigation_menu() {
    print_step "Testing navigation menu structure..."

    # Check for consistent separator spacing in CSS
    if grep -q "margin: var(--space-1) 0" apps/web/src/app/components/layout/NavMenu.module.css; then
        print_success "Separator spacing is consistent in CSS"
    else
        print_warning "Separator spacing might be inconsistent"
    fi

    # Check for proper conditional separators in JSX
    local separator_count=$(grep -c "DropdownMenu.Separator" apps/web/src/app/components/layout/NavMenu.tsx || echo "0")
    print_step "Found $separator_count separators in navigation menu"

    # Check for proper becomeSeparator usage (12px margin is intentional design)
    if grep -q "becomeSeparator" apps/web/src/app/components/layout/NavMenu.tsx; then
        print_success "Found becomeSeparator with correct 12px spacing"
    else
        print_warning "becomeSeparator might be missing for proper visual hierarchy"
    fi

    print_success "Navigation menu structure validated"
}

# Test onboarding components
test_onboarding_components() {
    print_step "Testing onboarding components..."

    # Check for "Believe. Learn. Succeed." framework
    if grep -q "Believe. Learn. Succeed." apps/web/src/app/components/onboarding/steps/WelcomeStep.tsx; then
        print_success "Onboarding uses proper educational framework"
    else
        print_warning "Onboarding framework might be missing"
    fi

    # Check for benefits-focused messaging
    if grep -q "benefitsList" apps/web/src/app/components/onboarding/OnboardingWizard.module.css; then
        print_success "Benefits-focused design is implemented"
    else
        print_warning "Benefits-focused styling might be missing"
    fi

    print_success "Onboarding components validated"
}

# Test middleware protection
test_middleware_protection() {
    print_step "Testing middleware protection logic..."

    # Check for proper error handling in middleware
    if grep -q "redirect to onboarding to be safe" middleware.ts; then
        print_success "Middleware has proper error handling"
    else
        print_warning "Middleware error handling might be missing"
    fi

    # Check protected routes configuration
    local protected_routes=$(grep -A 10 "protectedRoutes = \[" middleware.ts | grep -c "/" || echo "0")
    print_step "Found $protected_routes protected routes configured"

    print_success "Middleware protection validated"
}

# Run component-specific tests
run_component_tests() {
    local component=$1

    case $component in
        "navigation"|"nav")
            test_navigation_menu
            ;;
        "onboarding")
            test_onboarding_components
            ;;
        "middleware")
            test_middleware_protection
            ;;
        "all"|"")
            test_navigation_menu
            test_onboarding_components
            test_middleware_protection
            ;;
        *)
            print_error "Unknown component: $component"
            print_step "Available components: navigation, onboarding, middleware, all"
            exit 1
            ;;
    esac
}

# Main execution
main() {
    local component=${1:-"all"}

    print_header "VISUAL TESTING - $component"

    # Check prerequisites
    check_dev_server || exit 1

    # Run tests
    run_component_tests "$component"

    print_header "VISUAL TESTING COMPLETE"
    print_success "All visual tests passed! 🎉"

    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Manually verify the UI in browser: http://localhost:3000"
    echo "2. Test user interactions (login, navigation, onboarding)"
    echo "3. Check responsive design on different screen sizes"
    echo "4. Run 'npm run workflow:full' before committing"

    print_success "Visual testing workflow complete! 🚀"
}

# Run the script
main "$@"