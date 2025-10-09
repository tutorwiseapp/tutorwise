#!/bin/bash

# TutorWise Project Audit Script
# Automatically runs daily or ad-hoc project audits with baseline comparison

set -e

AUDIT_DIR="docs/project-audit"
CURRENT_DATE=$(date +%Y-%m-%d)  # Dynamic date for daily audits
CURRENT_AUDIT_FILE="$AUDIT_DIR/project-audit-$CURRENT_DATE.md"
AUDIT_CONFIG="tools/configs/audit-config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to find the most recent audit file
find_latest_audit() {
    local latest_file=$(ls -t $AUDIT_DIR/project-audit-*.md 2>/dev/null | head -1)
    if [ -n "$latest_file" ]; then
        echo "$latest_file"
    else
        echo ""
    fi
}

# Function to extract key metrics from audit file
extract_audit_metrics() {
    local audit_file="$1"
    if [ ! -f "$audit_file" ]; then
        echo "ERROR: Audit file not found: $audit_file"
        return 1
    fi

    log_info "Extracting metrics from: $(basename $audit_file)"

    # Extract health score
    local health_score=$(grep -o "Overall Project Health Score: [0-9.]*" "$audit_file" | head -1 | grep -o "[0-9.]*")

    # Extract audit date
    local audit_date=$(grep "Audit Date" "$audit_file" | head -1 | sed 's/.*: //')

    # Extract critical issues count
    local critical_issues=$(grep -c "Priority: Critical\|CRITICAL" "$audit_file" 2>/dev/null || echo "0")

    # Extract high issues count
    local high_issues=$(grep -c "Priority: High\|HIGH" "$audit_file" 2>/dev/null || echo "0")

    echo "HEALTH_SCORE=$health_score"
    echo "AUDIT_DATE=$audit_date"
    echo "CRITICAL_ISSUES=$critical_issues"
    echo "HIGH_ISSUES=$high_issues"
}

# Function to compare with previous audit
compare_audits() {
    local latest_audit="$1"
    local current_audit="$2"

    if [ -z "$latest_audit" ]; then
        log_warning "No previous audit found for comparison"
        echo "BASELINE_COMPARISON=FIRST_AUDIT" >> "$current_audit"
        return 0
    fi

    log_info "Comparing with previous audit: $(basename $latest_audit)"

    # Extract metrics from both audits
    local prev_metrics=$(extract_audit_metrics "$latest_audit")
    local prev_score=$(echo "$prev_metrics" | grep "HEALTH_SCORE" | cut -d'=' -f2)
    local prev_critical=$(echo "$prev_metrics" | grep "CRITICAL_ISSUES" | cut -d'=' -f2)
    local prev_high=$(echo "$prev_metrics" | grep "HIGH_ISSUES" | cut -d'=' -f2)

    # Current audit should have these metrics if it exists
    if [ -f "$current_audit" ]; then
        local curr_metrics=$(extract_audit_metrics "$current_audit")
        local curr_score=$(echo "$curr_metrics" | grep "HEALTH_SCORE" | cut -d'=' -f2)
        local curr_critical=$(echo "$curr_metrics" | grep "CRITICAL_ISSUES" | cut -d'=' -f2)
        local curr_high=$(echo "$curr_metrics" | grep "HIGH_ISSUES" | cut -d'=' -f2)

        # Add comparison section to current audit
        cat >> "$current_audit" << EOF

## Baseline Comparison with Previous Audit

### Previous Audit: $(basename $latest_audit)
- **Health Score**: $prev_score/10
- **Critical Issues**: $prev_critical
- **High Priority Issues**: $prev_high

### Current Audit: $(basename $current_audit)
- **Health Score**: $curr_score/10
- **Critical Issues**: $curr_critical
- **High Priority Issues**: $curr_high

### Change Analysis:
- **Health Score Change**: $(echo "$curr_score - $prev_score" | bc 2>/dev/null || echo "N/A")
- **Critical Issues Change**: $(echo "$curr_critical - $prev_critical" | bc 2>/dev/null || echo "N/A")
- **High Issues Change**: $(echo "$curr_high - $prev_high" | bc 2>/dev/null || echo "N/A")

EOF
    fi

    # Log comparison results
    if [ -n "$prev_score" ] && [ -n "$curr_score" ]; then
        local score_diff=$(echo "$curr_score - $prev_score" | bc 2>/dev/null || echo "0")
        if (( $(echo "$score_diff > 0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "Health score improved: $prev_score → $curr_score (+$score_diff)"
        elif (( $(echo "$score_diff < 0" | bc -l 2>/dev/null || echo "0") )); then
            log_warning "Health score decreased: $prev_score → $curr_score ($score_diff)"
        else
            log_info "Health score unchanged: $curr_score"
        fi
    fi
}

# Function to validate audit file structure
validate_audit_structure() {
    local audit_file="$1"
    local required_sections=(
        "# Tutorwise Project Audit"
        "## Executive Summary"
        "## Conclusion"
    )

    log_info "Validating audit structure..."

    for section in "${required_sections[@]}"; do
        if ! grep -qi "$section" "$audit_file"; then
            log_error "Missing required section: $section"
            return 1
        fi
    done

    log_success "Audit structure validation passed"
    return 0
}

# Function to update audit config
update_audit_config() {
    local audit_file="$1"

    # Create audit config if it doesn't exist
    mkdir -p "$(dirname $AUDIT_CONFIG)"

    cat > "$AUDIT_CONFIG" << EOF
{
  "lastAuditDate": "$CURRENT_DATE",
  "lastAuditFile": "$audit_file",
  "auditFrequency": "weekly",
  "nextScheduledAudit": "$(date -d '+7 days' +%Y-%m-%d)",
  "auditHistory": [
    {
      "date": "$CURRENT_DATE",
      "file": "$audit_file",
      "trigger": "manual"
    }
  ],
  "auditChecks": {
    "previousAuditComparison": true,
    "structureValidation": true,
    "baselineTracking": true
  },
  "emailNotifications": {
    "enabled": true,
    "recipient": "tutorwiseapp@gmail.com",
    "lastSent": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
  }
}
EOF

    log_success "Updated audit configuration: $AUDIT_CONFIG"
}

# Function to generate unified audit
generate_unified_audit() {
    local audit_file="$1"
    local unified_script="tools/scripts/project-audit.js"

    if [ -f "$unified_script" ]; then
        log_info "Generating unified audit with comprehensive analysis..."

        if node "$unified_script"; then
            log_success "Unified audit generated successfully"
            return 0
        else
            log_warning "Unified audit generation failed, continuing with standard audit"
            return 1
        fi
    else
        log_warning "Unified audit script not found: $unified_script"
        return 1
    fi
}

# Function to send audit email
send_audit_email() {
    local audit_file="$1"
    local email_script="tools/scripts/email/send-audit-email.js"

    if [ -f "$email_script" ]; then
        log_info "Sending audit email notification..."

        if node "$email_script" "$audit_file"; then
            log_success "Audit email sent successfully"
        else
            log_warning "Email sending failed, but audit completed successfully"
        fi
    else
        log_warning "Email script not found: $email_script"
        log_info "Audit completed without email notification"
    fi
}

# Main audit execution function
run_audit() {
    local audit_type="$1"

    log_info "Starting TutorWise project audit ($audit_type)"
    log_info "Date: $CURRENT_DATE"

    # Ensure audit directory exists
    mkdir -p "$AUDIT_DIR"

    # Find latest previous audit
    local latest_audit=$(find_latest_audit)

    if [ -n "$latest_audit" ]; then
        log_info "Previous audit found: $(basename $latest_audit)"

        # Extract previous audit date
        local prev_date=$(basename "$latest_audit" | sed 's/project-audit-//' | sed 's/.md//')
        log_info "Previous audit date: $prev_date"

        # Check if we already have an audit for today
        if [ -f "$CURRENT_AUDIT_FILE" ]; then
            log_warning "Audit already exists for today: $CURRENT_AUDIT_FILE"
            echo "Do you want to overwrite it? (y/N)"
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                log_info "Audit cancelled by user"
                exit 0
            fi
        fi

        # Display previous audit summary
        echo
        log_info "=== Previous Audit Summary ==="
        extract_audit_metrics "$latest_audit"
        echo

    else
        log_warning "No previous audit found - this will be the baseline audit"
    fi

    # Check if current audit file exists
    if [ -f "$CURRENT_AUDIT_FILE" ]; then
        log_info "Current audit file exists, performing comparison..."
        compare_audits "$latest_audit" "$CURRENT_AUDIT_FILE"
        validate_audit_structure "$CURRENT_AUDIT_FILE"
    else
        log_error "Current audit file not found: $CURRENT_AUDIT_FILE"
        log_info "Please run the audit generation process first"
        exit 1
    fi

    # Update configuration
    update_audit_config "$CURRENT_AUDIT_FILE"

    # Generate unified audit with comprehensive analysis
    generate_unified_audit "$CURRENT_AUDIT_FILE"

    # Send email notification (includes unified files if available)
    send_audit_email "$CURRENT_AUDIT_FILE"

    # Final summary
    echo
    log_success "=== Audit Completed ==="
    log_info "Audit file: $CURRENT_AUDIT_FILE"
    log_info "Previous baseline: ${latest_audit:-'None'}"
    log_info "Next scheduled audit: $(date -d '+7 days' +%Y-%m-%d)"

    # Display current metrics
    echo
    log_info "=== Current Audit Summary ==="
    extract_audit_metrics "$CURRENT_AUDIT_FILE"
}

# Script entry point
main() {
    local audit_type="${1:-adhoc}"

    case "$audit_type" in
        "daily"|"weekly"|"adhoc"|"scheduled")
            run_audit "$audit_type"
            ;;
        "validate")
            if [ -f "$CURRENT_AUDIT_FILE" ]; then
                validate_audit_structure "$CURRENT_AUDIT_FILE"
            else
                log_error "No audit file found for today: $CURRENT_AUDIT_FILE"
                exit 1
            fi
            ;;
        "compare")
            local latest_audit=$(find_latest_audit)
            if [ -f "$CURRENT_AUDIT_FILE" ] && [ -n "$latest_audit" ]; then
                compare_audits "$latest_audit" "$CURRENT_AUDIT_FILE"
            else
                log_error "Cannot compare - missing audit files"
                exit 1
            fi
            ;;
        *)
            echo "Usage: $0 [daily|weekly|adhoc|scheduled|validate|compare]"
            echo
            echo "Commands:"
            echo "  daily     - Run daily audit with previous audit comparison"
            echo "  weekly    - Run weekly comprehensive audit"
            echo "  adhoc     - Run ad-hoc audit (default)"
            echo "  scheduled - Run scheduled audit"
            echo "  validate  - Validate current audit structure"
            echo "  compare   - Compare current audit with previous"
            echo
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"