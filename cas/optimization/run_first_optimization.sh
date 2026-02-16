#!/bin/bash
# CAS DSPy First Optimization Run
#
# This script runs the first DSPy optimization for Sage using user feedback data.
# Prerequisites:
# - Python 3.11+ venv with dependencies installed
# - Environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_AI_API_KEY (or ANTHROPIC_API_KEY)
# - User feedback in ai_feedback table

set -e

# Change to the optimization directory
cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies if needed
if ! python -c "import dspy" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Load environment from .env.local if it exists
if [ -f "../../.env.local" ]; then
    export $(grep -v '^#' ../../.env.local | xargs)
fi

# Run the optimization
echo "=========================================="
echo "CAS DSPy Optimization - First Run"
echo "=========================================="
echo ""
echo "Agent: sage"
echo "Model: gemini/gemini-2.0-flash"
echo "Signatures: all (maths, explain, diagnose)"
echo ""

# Run with dry-run first to preview
if [ "$1" == "--dry-run" ]; then
    echo "[DRY RUN] Would run optimization without marking feedback as processed"
    python run_dspy.py --agent sage --all --dry-run
else
    python run_dspy.py --agent sage --all
fi

echo ""
echo "=========================================="
echo "Optimization complete!"
echo "=========================================="
echo ""
echo "Optimized prompts saved to: output/optimized_sage_latest.json"
echo "These will be automatically loaded by Sage providers."
