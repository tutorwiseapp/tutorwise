#!/bin/bash

# Gemini CLI Automation Scripts for Tutorwise Development
# Provides quick access to common Gemini CLI workflows

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEMINI_CLI="$SCRIPT_DIR/gemini-cli.py"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Gemini CLI exists
if [ ! -f "$GEMINI_CLI" ]; then
    echo -e "${RED}❌ Gemini CLI not found at $GEMINI_CLI${NC}"
    exit 1
fi

# Function to check environment variables
check_env() {
    if [ -z "$GOOGLE_AI_API_KEY" ]; then
        echo -e "${RED}❌ GOOGLE_AI_API_KEY environment variable not set${NC}"
        echo "Please set your Google AI API key:"
        echo "export GOOGLE_AI_API_KEY=your_api_key_here"
        exit 1
    fi
}

# Function to sync all context before using Gemini
sync_context() {
    echo -e "${BLUE}🔄 Syncing all context data...${NC}"

    # Run all sync scripts
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        cd "$PROJECT_ROOT"

        # Sync Jira if configured
        if [ -n "$JIRA_BASE_URL" ] && [ -n "$JIRA_EMAIL" ] && [ -n "$JIRA_API_TOKEN" ]; then
            echo -e "${YELLOW}📋 Syncing Jira...${NC}"
            npm run sync:jira 2>/dev/null || echo "Note: Jira sync not available via npm"
        fi

        # Sync GitHub if configured
        if [ -n "$GITHUB_TOKEN" ]; then
            echo -e "${YELLOW}📱 Syncing GitHub...${NC}"
            npm run sync:github 2>/dev/null || echo "Note: GitHub sync not available via npm"
        fi

        # Sync other integrations
        npm run sync:context 2>/dev/null || echo "Note: General context sync not available"
    fi

    echo -e "${GREEN}✅ Context sync completed${NC}"
}

# Function to run Gemini CLI with proper setup
run_gemini() {
    cd "$PROJECT_ROOT"
    python3 "$GEMINI_CLI" "$@"
}

# Main menu function
show_menu() {
    echo -e "${BLUE}🤖 Tutorwise Gemini CLI Workflows${NC}"
    echo ""
    echo "1. Interactive Chat"
    echo "2. Analyze Jira Ticket"
    echo "3. Code Review"
    echo "4. Debug Help"
    echo "5. Development Planning"
    echo "6. Quick Question"
    echo "7. Sync Context & Chat"
    echo "8. Custom Command"
    echo "q. Quit"
    echo ""
    read -p "Select option (1-8, q): " choice
}

# Process menu choice
process_choice() {
    case $choice in
        1)
            echo -e "${GREEN}🚀 Starting interactive chat...${NC}"
            run_gemini --interactive
            ;;
        2)
            read -p "Enter Jira ticket key (e.g., TUTOR-20): " ticket
            if [ -n "$ticket" ]; then
                echo -e "${GREEN}📋 Analyzing ticket $ticket...${NC}"
                run_gemini analyze --ticket "$ticket"
            else
                echo -e "${RED}❌ No ticket key provided${NC}"
            fi
            ;;
        3)
            read -p "Describe code/implementation to review: " description
            if [ -n "$description" ]; then
                echo -e "${GREEN}🔍 Performing code review...${NC}"
                run_gemini review --query "$description"
            else
                echo -e "${RED}❌ No description provided${NC}"
            fi
            ;;
        4)
            read -p "Describe the error/issue: " error
            if [ -n "$error" ]; then
                echo -e "${GREEN}🐛 Getting debug help...${NC}"
                run_gemini debug --query "$error"
            else
                echo -e "${RED}❌ No error description provided${NC}"
            fi
            ;;
        5)
            echo -e "${GREEN}📅 Generating development plan...${NC}"
            run_gemini plan
            ;;
        6)
            read -p "Enter your question: " question
            if [ -n "$question" ]; then
                echo -e "${GREEN}💬 Quick chat...${NC}"
                run_gemini chat --query "$question" --minimal
            else
                echo -e "${RED}❌ No question provided${NC}"
            fi
            ;;
        7)
            sync_context
            echo -e "${GREEN}🚀 Starting chat with fresh context...${NC}"
            run_gemini --interactive
            ;;
        8)
            read -p "Enter custom command: " custom_cmd
            if [ -n "$custom_cmd" ]; then
                echo -e "${GREEN}⚙️ Running custom command...${NC}"
                eval "run_gemini $custom_cmd"
            else
                echo -e "${RED}❌ No command provided${NC}"
            fi
            ;;
        q|Q)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option${NC}"
            ;;
    esac
}

# Main execution
main() {
    check_env

    # If arguments provided, run directly
    if [ $# -gt 0 ]; then
        run_gemini "$@"
        exit $?
    fi

    # Otherwise show interactive menu
    while true; do
        show_menu
        process_choice
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
}

# Help function
show_help() {
    echo "Tutorwise Gemini CLI Automation"
    echo ""
    echo "Usage:"
    echo "  $0                    # Interactive menu"
    echo "  $0 [gemini_options]   # Direct Gemini CLI execution"
    echo ""
    echo "Examples:"
    echo "  $0                              # Show interactive menu"
    echo "  $0 chat -q \"How to add tests?\"  # Quick question"
    echo "  $0 analyze -t TUTOR-20          # Analyze ticket"
    echo "  $0 --interactive                # Interactive mode"
    echo ""
    echo "Environment Variables:"
    echo "  GOOGLE_AI_API_KEY     # Required: Your Google AI API key"
    echo "  JIRA_BASE_URL         # Optional: For Jira integration"
    echo "  JIRA_EMAIL            # Optional: For Jira integration"
    echo "  JIRA_API_TOKEN        # Optional: For Jira integration"
    echo "  GITHUB_TOKEN          # Optional: For GitHub integration"
}

# Handle help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"