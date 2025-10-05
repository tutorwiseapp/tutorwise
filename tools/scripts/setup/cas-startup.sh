#!/bin/bash

# TutorWise Startup Utility
# Manages all tools, scripts, and services for Claude Code sessions

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REGISTRY_FILE="$PROJECT_ROOT/cas/config/service-registry.json"
PID_DIR="/tmp/tutorwise-services"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Auto-setup: Ensure direnv is loaded if .envrc exists
if [ -f "$PROJECT_ROOT/.envrc" ]; then
    if command -v direnv >/dev/null 2>&1; then
        # Load direnv hook if not already loaded
        if ! type -t _direnv_hook >/dev/null 2>&1; then
            eval "$(direnv hook bash)" 2>/dev/null || eval "$(direnv hook zsh)" 2>/dev/null || true
        fi
        # Allow and load .envrc
        direnv allow "$PROJECT_ROOT" 2>/dev/null || true
    fi
fi

# Ensure PID directory exists
mkdir -p "$PID_DIR"

# Load environment variables from .env.local
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    set -a
    source <(grep -v '^#' "$PROJECT_ROOT/.env.local" | grep -v '^$' | sed 's/^/export /')
    set +a
fi

# Function to check if a service is running
check_service_status() {
    local service_name="$1"
    local check_command="$2"
    local pid_file="$PID_DIR/${service_name}.pid"

    # Check PID file first
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "running"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi

    # Run health check command if provided
    if [ -n "$check_command" ]; then
        if eval "$check_command" > /dev/null 2>&1; then
            echo "running"
            return 0
        fi
    fi

    echo "stopped"
    return 1
}

# Function to start a service
start_service() {
    local service_name="$1"
    local start_command="$2"
    local pid_file="$PID_DIR/${service_name}.pid"
    local log_file="$PROJECT_ROOT/logs/${service_name}.log"

    mkdir -p "$PROJECT_ROOT/logs"

    echo -e "${BLUE}Starting ${service_name}...${NC}"

    # Start service in background and capture PID
    eval "$start_command" >> "$log_file" 2>&1 &
    local pid=$!
    echo "$pid" > "$pid_file"

    # Wait a moment and verify it started
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${service_name} started (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}✗ ${service_name} failed to start${NC}"
        rm -f "$pid_file"
        return 1
    fi
}

# Function to stop a service
stop_service() {
    local service_name="$1"
    local pid_file="$PID_DIR/${service_name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${BLUE}Stopping ${service_name} (PID: $pid)...${NC}"
            kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
            rm -f "$pid_file"
            echo -e "${GREEN}✓ ${service_name} stopped${NC}"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi

    echo -e "${YELLOW}${service_name} is not running${NC}"
    return 0
}

# Function to wrap text - just truncate if too long
wrap_text_simple() {
    local text="$1"
    local width="$2"

    if [ ${#text} -le $width ]; then
        echo "$text"
    else
        echo "${text:0:$((width-3))}..."
    fi
}

# Function to display service table
display_service_table() {
    # Calculate table width: 4 + 25 + 40 + 2 + 45 + 9 + 6 (ACTION word) = 137
    local table_width=137
    local line=$(printf '━%.0s' $(seq 1 $table_width))

    echo ""
    echo "$line"
    printf "%-4s %-25s %-40s %2s %-45s %-9s %s\n" "#" "TOOL NAME" "FILE NAME" "" "DESCRIPTION" "STATUS" "ACTION"
    echo "$line"

    # Parse service registry and display each service
    if [ -f "$REGISTRY_FILE" ]; then
        local services=$(jq -r '.services[] | @base64' "$REGISTRY_FILE")
        local index=1

        for service in $services; do
            local name=$(echo "$service" | base64 --decode | jq -r '.name')
            local file=$(echo "$service" | base64 --decode | jq -r '.file // "N/A"')
            local description=$(echo "$service" | base64 --decode | jq -r '.description')
            local check_cmd=$(echo "$service" | base64 --decode | jq -r '.check_command // ""')

            # Truncate text if too long
            name=$(wrap_text_simple "$name" 25)
            file=$(wrap_text_simple "$file" 40)
            description=$(wrap_text_simple "$description" 45)

            # Check status
            local status=$(check_service_status "$name" "$check_cmd")
            local status_display
            local action

            if [ "$status" = "running" ]; then
                status_display="${GREEN}● RUNNING${NC}"
                action="stop"
            else
                status_display="${RED}○ STOPPED${NC}"
                action="start"
            fi

            printf "%-4s %-25s %-40s %2s %-45s %-9b %s\n" "[$index]" "$name" "$file" "" "$description" "$status_display" "$action"
            ((index++))
        done
    else
        echo "Service registry not found: $REGISTRY_FILE"
    fi

    echo "$line"
    echo ""
}

# Function to start all services in dependency order
start_all_services() {
    echo -e "${BLUE}Starting all services in dependency order...${NC}"

    if [ ! -f "$REGISTRY_FILE" ]; then
        echo -e "${RED}Service registry not found${NC}"
        return 1
    fi

    local services=$(jq -r '.services[] | @base64' "$REGISTRY_FILE")

    for service in $services; do
        local name=$(echo "$service" | base64 --decode | jq -r '.name')
        local start_cmd=$(echo "$service" | base64 --decode | jq -r '.start_command // ""')
        local check_cmd=$(echo "$service" | base64 --decode | jq -r '.check_command // ""')
        local auto_start=$(echo "$service" | base64 --decode | jq -r '.auto_start // true')

        if [ "$auto_start" = "false" ]; then
            echo -e "${YELLOW}Skipping ${name} (auto_start disabled)${NC}"
            continue
        fi

        local status=$(check_service_status "$name" "$check_cmd")

        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✓ ${name} already running${NC}"
        else
            if [ -n "$start_cmd" ]; then
                start_service "$name" "$start_cmd"
            fi
        fi

        # Brief delay between services
        sleep 1
    done

    echo -e "${GREEN}All services startup complete${NC}"
}

# Function to stop all services
stop_all_services() {
    echo -e "${BLUE}Stopping all services...${NC}"

    if [ ! -f "$REGISTRY_FILE" ]; then
        echo -e "${RED}Service registry not found${NC}"
        return 1
    fi

    local services=$(jq -r '.services[] | @base64' "$REGISTRY_FILE")

    for service in $services; do
        local name=$(echo "$service" | base64 --decode | jq -r '.name')
        stop_service "$name"
    done

    echo -e "${GREEN}All services stopped${NC}"
}

# Main menu
main_menu() {
    while true; do
        clear
        echo ""
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║           TutorWise Startup Utility Manager                 ║"
        echo "╚══════════════════════════════════════════════════════════════╝"

        display_service_table

        echo "Commands:"
        echo "  [number]       - Toggle service (start/stop)"
        echo "  start-all      - Start all services"
        echo "  stop-all       - Stop all services"
        echo "  restart-all    - Restart all services"
        echo "  refresh        - Refresh status"
        echo "  quit           - Exit utility"
        echo ""

        read -p "Enter command: " cmd

        case "$cmd" in
            start-all)
                start_all_services
                read -p "Press Enter to continue..."
                ;;
            stop-all)
                stop_all_services
                read -p "Press Enter to continue..."
                ;;
            restart-all)
                stop_all_services
                sleep 2
                start_all_services
                read -p "Press Enter to continue..."
                ;;
            refresh)
                # Just loop to refresh
                ;;
            quit|q|exit)
                echo "Goodbye!"
                exit 0
                ;;
            [0-9]*)
                # Toggle specific service
                local services=$(jq -r '.services[] | @base64' "$REGISTRY_FILE")
                local index=1

                for service in $services; do
                    if [ "$index" -eq "$cmd" ]; then
                        local name=$(echo "$service" | base64 --decode | jq -r '.name')
                        local start_cmd=$(echo "$service" | base64 --decode | jq -r '.start_command // ""')
                        local check_cmd=$(echo "$service" | base64 --decode | jq -r '.check_command // ""')

                        local status=$(check_service_status "$name" "$check_cmd")

                        if [ "$status" = "running" ]; then
                            stop_service "$name"
                        else
                            start_service "$name" "$start_cmd"
                        fi

                        read -p "Press Enter to continue..."
                        break
                    fi
                    ((index++))
                done
                ;;
            *)
                echo "Invalid command"
                sleep 1
                ;;
        esac
    done
}

# CLI mode (non-interactive)
if [ "$1" = "status" ]; then
    display_service_table
    exit 0
elif [ "$1" = "start-all" ]; then
    start_all_services
    exit 0
elif [ "$1" = "stop-all" ]; then
    stop_all_services
    exit 0
elif [ "$1" = "restart-all" ]; then
    stop_all_services
    sleep 2
    start_all_services
    exit 0
else
    # Interactive mode
    main_menu
fi
