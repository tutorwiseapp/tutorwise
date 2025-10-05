#!/bin/bash

# Claude Code Login Script
# Automatically runs when you start using Claude Code
# Initializes all necessary tools, scripts, and services

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STARTUP_UTILITY="$PROJECT_ROOT/tools/scripts/cas-startup.sh"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Welcome to TutorWise Development Environment        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | grep -v '^$' | xargs) 2>/dev/null || true
    echo -e "${GREEN}✓ Environment variables loaded from .env.local${NC}"
fi

# Validate critical environment variables
echo ""
echo -e "${BLUE}Validating environment configuration...${NC}"

# Check Railway
if [ -n "$RAILWAY_API_TOKEN" ]; then
    echo -e "${GREEN}✓ Railway API token configured${NC}"
else
    echo -e "${YELLOW}⚠ Railway API token not found${NC}"
fi

# Check Supabase
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${GREEN}✓ Supabase configured${NC}"
else
    echo -e "${YELLOW}⚠ Supabase not configured${NC}"
fi

# Check Neo4j
if [ -n "$NEO4J_URI" ]; then
    echo -e "${GREEN}✓ Neo4j configured${NC}"
else
    echo -e "${YELLOW}⚠ Neo4j not configured${NC}"
fi

# Check Redis
if [ -n "$REDIS_URL" ]; then
    echo -e "${GREEN}✓ Redis configured${NC}"
else
    echo -e "${YELLOW}⚠ Redis not configured${NC}"
fi

# Check Jira
if [ -n "$JIRA_BASE_URL" ]; then
    echo -e "${GREEN}✓ Jira integration configured${NC}"
else
    echo -e "${YELLOW}⚠ Jira integration not configured${NC}"
fi

echo ""
echo -e "${BLUE}Initializing services...${NC}"
echo ""

# Make startup utility executable
chmod +x "$STARTUP_UTILITY"

# Check current service status
echo "Current service status:"
bash "$STARTUP_UTILITY" status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "What would you like to do?"
echo ""
echo "  1) Start all services automatically"
echo "  2) Open interactive service manager"
echo "  3) Start only core services (Neo4j, Redis, Backend, Frontend)"
echo "  4) Skip and continue to Claude Code"
echo ""

read -p "Enter your choice (1-4): " choice

case "$choice" in
    1)
        echo ""
        echo -e "${BLUE}Starting all services...${NC}"
        bash "$STARTUP_UTILITY" start-all
        ;;
    2)
        echo ""
        bash "$STARTUP_UTILITY"
        ;;
    3)
        echo ""
        echo -e "${BLUE}Starting core services...${NC}"
        # Start Neo4j
        docker-compose up neo4j -d 2>/dev/null || echo "Neo4j already running or not configured"
        # Start Redis
        docker-compose up redis -d 2>/dev/null || echo "Redis already running or not configured"
        sleep 3
        # Start Backend
        cd "$PROJECT_ROOT" && npm run dev:api > /dev/null 2>&1 &
        echo $! > /tmp/tutorwise-services/backend-api.pid
        echo -e "${GREEN}✓ Backend API starting...${NC}"
        sleep 3
        # Start Frontend
        cd "$PROJECT_ROOT" && npm run dev:web > /dev/null 2>&1 &
        echo $! > /tmp/tutorwise-services/frontend-web.pid
        echo -e "${GREEN}✓ Frontend Web starting...${NC}"
        ;;
    4)
        echo -e "${YELLOW}Skipping service startup${NC}"
        ;;
    *)
        echo -e "${YELLOW}Invalid choice, skipping service startup${NC}"
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✓ Claude Code initialization complete${NC}"
echo ""
echo "Quick commands:"
echo "  • Service Manager:  bash tools/scripts/startup-utility.sh"
echo "  • Check Status:     bash tools/scripts/startup-utility.sh status"
echo "  • Start All:        bash tools/scripts/startup-utility.sh start-all"
echo "  • Stop All:         bash tools/scripts/startup-utility.sh stop-all"
echo ""
echo "Happy coding! 🚀"
echo ""
