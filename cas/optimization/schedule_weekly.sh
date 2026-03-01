#!/bin/bash
# CAS DSPy Weekly Optimization Scheduler
#
# Runs DSPy optimization weekly using accumulated user feedback.
# Designed to be triggered by:
#   - Supabase pg_cron (primary — via /api/cron/cas-dspy-optimize route)
#   - System crontab (fallback)
#
# Usage:
#   ./schedule_weekly.sh                    # Optimize all agents
#   ./schedule_weekly.sh --agent sage       # Sage only
#   ./schedule_weekly.sh --agent lexi       # Lexi only
#   ./schedule_weekly.sh --dry-run          # Preview without processing
#
# Crontab entry (every Sunday at 2am):
#   0 2 * * 0 /path/to/tutorwise/cas/optimization/schedule_weekly.sh >> /var/log/dspy-optimize.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_PREFIX="[DSPy Scheduler $(date -u '+%Y-%m-%d %H:%M:%S UTC')]"
AGENT="${1:---all}"
DRY_RUN=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --agent) AGENT="$2"; shift 2 ;;
    --dry-run) DRY_RUN="--dry-run"; shift ;;
    --all) AGENT="--all"; shift ;;
    *) shift ;;
  esac
done

cd "$SCRIPT_DIR"

echo "$LOG_PREFIX Starting weekly DSPy optimization"
echo "$LOG_PREFIX Agent: $AGENT"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "$LOG_PREFIX Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install/update dependencies
if ! python -c "import dspy" 2>/dev/null; then
    echo "$LOG_PREFIX Installing dependencies..."
    pip install -q -r requirements.txt
fi

# Load environment
if [ -f "../../.env.local" ]; then
    set -a
    source <(grep -v '^#' ../../.env.local | grep -v '^\s*$')
    set +a
fi

# Check required env vars
if [ -z "${SUPABASE_URL:-}" ] && [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
    echo "$LOG_PREFIX ERROR: SUPABASE_URL not set"
    exit 1
fi

if [ -z "${GOOGLE_AI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "$LOG_PREFIX ERROR: No LLM API key set (need GOOGLE_AI_API_KEY or ANTHROPIC_API_KEY)"
    exit 1
fi

# Run optimization based on agent selection
run_optimization() {
    local agent=$1
    echo "$LOG_PREFIX Optimizing $agent..."

    local start_time=$(date +%s)

    if python run_dspy.py --agent "$agent" --all $DRY_RUN; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "$LOG_PREFIX $agent optimization completed in ${duration}s"

        # Verify output file was created
        local output_file="output/optimized_${agent}_latest.json"
        if [ -f "$output_file" ]; then
            local file_size=$(wc -c < "$output_file" | tr -d ' ')
            echo "$LOG_PREFIX Output: $output_file (${file_size} bytes)"
        fi
    else
        echo "$LOG_PREFIX ERROR: $agent optimization failed"
        return 1
    fi
}

# Track overall success
FAILURES=0

if [ "$AGENT" == "--all" ]; then
    # Optimize both agents
    run_optimization "sage" || FAILURES=$((FAILURES + 1))
    run_optimization "lexi" || FAILURES=$((FAILURES + 1))
else
    run_optimization "$AGENT" || FAILURES=$((FAILURES + 1))
fi

# Summary
echo ""
echo "$LOG_PREFIX =========================================="
if [ $FAILURES -eq 0 ]; then
    echo "$LOG_PREFIX Weekly optimization completed successfully"
else
    echo "$LOG_PREFIX Weekly optimization completed with $FAILURES failure(s)"
fi
echo "$LOG_PREFIX =========================================="

exit $FAILURES
