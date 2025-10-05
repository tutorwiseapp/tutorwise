#!/bin/bash
# CAS Global Installation Script
# Installs CAS as a system-wide, project-agnostic command-line tool

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration - No sudo required!
INSTALL_DIR="$HOME/.local/bin"
CAS_COMMAND="cas"
CAS_CONFIG_DIR="$HOME/.config/cas"
PROJECTS_FILE="$CAS_CONFIG_DIR/projects.json"

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   CAS System-Wide Installation             ║${NC}"
echo -e "${CYAN}║   Contextual Autonomous System Manager     ║${NC}"
echo -e "${CYAN}║   Project-Agnostic Service Manager         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Create directories
echo -e "${BLUE}📁 Creating CAS directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$CAS_CONFIG_DIR"

# Create projects config if doesn't exist
if [ ! -f "$PROJECTS_FILE" ]; then
    echo '{"projects":[]}' > "$PROJECTS_FILE"
    echo -e "${GREEN}✅ Created projects config${NC}"
fi

# Step 1: Create CAS main command
echo -e "\n${BLUE}📝 Step 1: Creating CAS command...${NC}"

CAS_WRAPPER="$INSTALL_DIR/$CAS_COMMAND"

cat > "$CAS_WRAPPER" << 'EOFWRAPPER'
#!/bin/bash
# CAS - Contextual Autonomous System Manager
# Universal project service manager

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

CAS_CONFIG_DIR="$HOME/.config/cas"
PROJECTS_FILE="$CAS_CONFIG_DIR/projects.json"

# Helper: Get current project or fallback to tutorwise
get_project_root() {
    # Check if we're in a project with .cas-config
    local current_dir="$PWD"
    while [ "$current_dir" != "/" ]; do
        if [ -f "$current_dir/.cas-config" ]; then
            echo "$current_dir"
            return 0
        fi
        current_dir=$(dirname "$current_dir")
    done

    # Try to detect project from projects.json
    if [ -f "$PROJECTS_FILE" ]; then
        local project_root=$(jq -r '.projects[] | select(.active == true) | .root' "$PROJECTS_FILE" 2>/dev/null | head -1)
        if [ -n "$project_root" ] && [ -d "$project_root" ]; then
            echo "$project_root"
            return 0
        fi
    fi

    # Fallback to tutorwise (backward compatibility)
    echo "/Users/michaelquan/projects/tutorwise"
}

# Helper: Register a project
register_project() {
    local project_root="${1:-$PWD}"
    local project_name=$(basename "$project_root")

    echo -e "${BLUE}📦 Registering project: $project_name${NC}"
    echo -e "${YELLOW}   Location: $project_root${NC}"

    # Create .cas-config in project
    cat > "$project_root/.cas-config" << EOFCONFIG
{
  "name": "$project_name",
  "root": "$project_root",
  "startup_script": "tools/scripts/setup/cas-startup.sh",
  "services": {
    "frontend": {"port": 3000, "health": "/api/health"},
    "backend": {"port": 8000, "health": "/health"},
    "databases": ["redis", "neo4j"]
  }
}
EOFCONFIG

    # Add to projects list
    if command -v jq >/dev/null 2>&1; then
        local temp_file=$(mktemp)
        jq ".projects += [{\"name\": \"$project_name\", \"root\": \"$project_root\", \"active\": true}] | .projects |= unique_by(.root)" "$PROJECTS_FILE" > "$temp_file"
        mv "$temp_file" "$PROJECTS_FILE"
    fi

    echo -e "${GREEN}✅ Project registered successfully${NC}"
    echo -e "${YELLOW}   Created: $project_root/.cas-config${NC}"
}

# Helper: List projects
list_projects() {
    echo -e "${CYAN}📋 Registered CAS Projects:${NC}"
    echo ""

    if [ -f "$PROJECTS_FILE" ]; then
        if command -v jq >/dev/null 2>&1; then
            jq -r '.projects[] | "  \(.name) → \(.root)"' "$PROJECTS_FILE" 2>/dev/null || echo "  No projects registered"
        else
            cat "$PROJECTS_FILE"
        fi
    else
        echo "  No projects registered"
    fi
    echo ""
}

# Helper: Show help
show_help() {
    cat << EOF
${CYAN}CAS - Contextual Autonomous System Manager${NC}
Universal service manager for any development project

${YELLOW}USAGE:${NC}
    cas <command> [options]

${YELLOW}PROJECT MANAGEMENT:${NC}
    ${GREEN}install${NC}         Register current directory as CAS project
    ${GREEN}list${NC}            List all registered projects
    ${GREEN}switch <name>${NC}   Switch active project

${YELLOW}SERVICE MANAGEMENT:${NC}
    ${GREEN}start${NC}           Start all services
    ${GREEN}stop${NC}            Stop all services
    ${GREEN}restart${NC}         Restart all services
    ${GREEN}status${NC}          Show service status
    ${GREEN}logs${NC}            View service logs (tail -f)
    ${GREEN}health${NC}          Check system health

${YELLOW}AUTO-START:${NC}
    ${GREEN}autostart on${NC}    Enable auto-start on login
    ${GREEN}autostart off${NC}   Disable auto-start

${YELLOW}UTILITIES:${NC}
    ${GREEN}version${NC}         Show CAS version
    ${GREEN}help${NC}            Show this help message

${YELLOW}EXAMPLES:${NC}
    ${MAGENTA}# Register a new project${NC}
    cd /path/to/my-project
    cas install

    ${MAGENTA}# Start services for current project${NC}
    cas start

    ${MAGENTA}# Check health${NC}
    cas health

${YELLOW}HOW IT WORKS:${NC}
    CAS automatically detects projects by looking for:
    1. .cas-config file in current directory (or parent)
    2. Active project in ~/.config/cas/projects.json
    3. Falls back to TutorWise (default)

EOF
}

# Get project root
PROJECT_ROOT=$(get_project_root)
CAS_SCRIPT="$PROJECT_ROOT/tools/scripts/setup/cas-startup.sh"

# Main command handler
case "${1:-help}" in
    install)
        register_project "${2:-$PWD}"
        ;;

    list)
        list_projects
        ;;

    switch)
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Project name required${NC}"
            exit 1
        fi
        # Switch active project in config
        if command -v jq >/dev/null 2>&1; then
            temp_file=$(mktemp)
            jq ".projects |= map(if .name == \"$2\" then .active = true else .active = false end)" "$PROJECTS_FILE" > "$temp_file"
            mv "$temp_file" "$PROJECTS_FILE"
            echo -e "${GREEN}✅ Switched to project: $2${NC}"
        fi
        ;;

    start)
        if [ ! -f "$CAS_SCRIPT" ]; then
            echo -e "${RED}❌ CAS startup script not found${NC}"
            echo -e "${YELLOW}   Run 'cas install' to register this project${NC}"
            exit 1
        fi
        echo -e "${CYAN}🚀 Starting services for: $(basename "$PROJECT_ROOT")${NC}"
        cd "$PROJECT_ROOT"
        bash "$CAS_SCRIPT" start-all
        ;;

    stop)
        echo -e "${CYAN}🛑 Stopping services...${NC}"
        cd "$PROJECT_ROOT"
        bash "$CAS_SCRIPT" stop-all
        ;;

    restart)
        echo -e "${CYAN}🔄 Restarting services...${NC}"
        cd "$PROJECT_ROOT"
        bash "$CAS_SCRIPT" restart-all
        ;;

    status)
        cd "$PROJECT_ROOT"
        bash "$CAS_SCRIPT" status
        ;;

    logs)
        cd "$PROJECT_ROOT"
        if [ -d "logs" ]; then
            echo -e "${CYAN}📋 Viewing logs (Ctrl+C to exit)...${NC}"
            tail -f logs/*.log 2>/dev/null || echo "No logs found"
        else
            echo -e "${YELLOW}⚠️  No logs directory${NC}"
        fi
        ;;

    health)
        echo -e "${CYAN}🏥 Health Check: $(basename "$PROJECT_ROOT")${NC}"
        echo ""

        # Frontend
        if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend${NC} - http://localhost:3000"
        else
            echo -e "${RED}❌ Frontend${NC} - Not responding"
        fi

        # Backend
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend${NC}  - http://localhost:8000"
        else
            echo -e "${RED}❌ Backend${NC}  - Not responding"
        fi

        # Redis
        if docker ps | grep redis | grep -q Up; then
            echo -e "${GREEN}✅ Redis${NC}    - Running"
        else
            echo -e "${RED}❌ Redis${NC}    - Stopped"
        fi

        # Neo4j
        if docker ps | grep neo4j | grep -q Up; then
            echo -e "${GREEN}✅ Neo4j${NC}    - Running"
        else
            echo -e "${RED}❌ Neo4j${NC}    - Stopped"
        fi
        echo ""
        ;;

    autostart)
        case "$2" in
            on)
                plist_file="$HOME/Library/LaunchAgents/com.cas.autostart.plist"
                cat > "$plist_file" << EOFPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cas.autostart</string>
    <key>ProgramArguments</key>
    <array>
        <string>$HOME/.local/bin/cas</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOFPLIST
                launchctl load "$plist_file" 2>/dev/null || true
                echo -e "${GREEN}✅ Auto-start enabled${NC}"
                ;;
            off)
                plist_file="$HOME/Library/LaunchAgents/com.cas.autostart.plist"
                launchctl unload "$plist_file" 2>/dev/null || true
                rm -f "$plist_file"
                echo -e "${GREEN}✅ Auto-start disabled${NC}"
                ;;
            *)
                echo -e "${RED}❌ Usage: cas autostart [on|off]${NC}"
                ;;
        esac
        ;;

    version)
        echo -e "${CYAN}CAS (Contextual Autonomous System)${NC}"
        echo "Version: 2.0.0"
        echo "Type: Universal Project Manager"
        echo "Current Project: $(basename "$PROJECT_ROOT")"
        ;;

    help|--help|-h)
        show_help
        ;;

    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
EOFWRAPPER

chmod +x "$CAS_WRAPPER"
echo -e "${GREEN}✅ CAS command created${NC}"

# Step 2: Add to PATH if needed
echo -e "\n${BLUE}🔧 Step 2: Configuring PATH...${NC}"

SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
fi

if [ -n "$SHELL_CONFIG" ] && [ -f "$SHELL_CONFIG" ]; then
    if ! grep -q "$INSTALL_DIR" "$SHELL_CONFIG"; then
        echo "" >> "$SHELL_CONFIG"
        echo "# CAS (Contextual Autonomous System)" >> "$SHELL_CONFIG"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_CONFIG"
        echo -e "${GREEN}✅ Added $INSTALL_DIR to PATH${NC}"
        echo -e "${YELLOW}   Run: source $SHELL_CONFIG${NC}"
    else
        echo -e "${GREEN}✅ PATH already configured${NC}"
    fi
fi

# Step 3: Register current project (TutorWise)
echo -e "\n${BLUE}📦 Step 3: Registering TutorWise project...${NC}"

TUTORWISE_ROOT="/Users/michaelquan/projects/tutorwise"
if [ -d "$TUTORWISE_ROOT" ]; then
    $CAS_WRAPPER install "$TUTORWISE_ROOT"
fi

# Step 4: Show completion
echo -e "\n${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Installation Complete! 🎉          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 CAS Commands:${NC}"
echo ""
echo -e "  ${GREEN}PROJECT SETUP:${NC}"
echo -e "    cas install      # Register current project"
echo -e "    cas list         # List all projects"
echo ""
echo -e "  ${GREEN}SERVICES:${NC}"
echo -e "    cas start        # Start services"
echo -e "    cas stop         # Stop services"
echo -e "    cas status       # Check status"
echo -e "    cas health       # Health check"
echo ""
echo -e "  ${GREEN}AUTO-START:${NC}"
echo -e "    cas autostart on # Enable on login"
echo ""

echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo ""
echo -e "  1. ${CYAN}Reload shell:${NC}   ${GREEN}source $SHELL_CONFIG${NC}"
echo -e "  2. ${CYAN}Test CAS:${NC}       ${GREEN}cas --help${NC}"
echo -e "  3. ${CYAN}Start services:${NC} ${GREEN}cas start${NC}"
echo ""

echo -e "${YELLOW}💡 Use in Other Projects:${NC}"
echo ""
echo -e "  ${MAGENTA}cd /path/to/another-project${NC}"
echo -e "  ${MAGENTA}cas install${NC}  # Register it"
echo -e "  ${MAGENTA}cas start${NC}    # Start its services"
echo ""

echo -e "${YELLOW}📍 Installed at:${NC} ${GREEN}$INSTALL_DIR/cas${NC}"
echo ""
