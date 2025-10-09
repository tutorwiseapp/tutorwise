#!/bin/bash

# Tutorwise Calendar Polling Service
# Runs Google Calendar polling continuously with 10-minute intervals

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-google-docs.js"
PID_FILE="/tmp/tutorwise-calendar-service.pid"
LOG_FILE="/tmp/tutorwise-calendar-service.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if service is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Start the service
start_service() {
    if is_running; then
        log_warning "Calendar polling service is already running"
        return 1
    fi

    log "Starting Tutorwise Calendar Polling Service..."

    # Validate environment
    if [ -z "$GOOGLE_SERVICE_ACCOUNT_PATH" ]; then
        log_error "GOOGLE_SERVICE_ACCOUNT_PATH environment variable not set"
        return 1
    fi

    if [ ! -f "$GOOGLE_SERVICE_ACCOUNT_PATH" ]; then
        log_error "Google service account file not found: $GOOGLE_SERVICE_ACCOUNT_PATH"
        return 1
    fi

    # Change to project directory
    cd "$PROJECT_ROOT"

    # Start the polling service in background
    nohup node "$SYNC_SCRIPT" poll-calendar >> "$LOG_FILE" 2>&1 &
    local pid=$!

    # Save PID
    echo "$pid" > "$PID_FILE"

    # Verify it started
    sleep 2
    if is_running; then
        log_success "Calendar polling service started with PID $pid"
        log "Service will poll every 10 minutes for calendar events"
        log "Log file: $LOG_FILE"
        log "PID file: $PID_FILE"
        return 0
    else
        log_error "Failed to start calendar polling service"
        return 1
    fi
}

# Stop the service
stop_service() {
    if ! is_running; then
        log_warning "Calendar polling service is not running"
        return 1
    fi

    local pid=$(cat "$PID_FILE")
    log "Stopping Tutorwise Calendar Polling Service (PID: $pid)..."

    # Send SIGTERM to gracefully stop
    kill "$pid" 2>/dev/null

    # Wait a bit and check
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
        log_warning "Service didn't stop gracefully, force killing..."
        kill -9 "$pid" 2>/dev/null
    fi

    # Clean up
    rm -f "$PID_FILE"
    log_success "Calendar polling service stopped"
}

# Restart the service
restart_service() {
    log "Restarting Tutorwise Calendar Polling Service..."
    stop_service
    sleep 1
    start_service
}

# Show service status
show_status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        log_success "Calendar polling service is running (PID: $pid)"

        # Show recent log entries
        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo -e "${BLUE}Recent log entries:${NC}"
            tail -10 "$LOG_FILE"
        fi

        return 0
    else
        log_warning "Calendar polling service is not running"
        return 1
    fi
}

# Test calendar connection
test_calendar() {
    log "Testing Google Calendar connection..."
    cd "$PROJECT_ROOT"
    node "$SYNC_SCRIPT" test-calendar
}

# Show service logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        if [ "$1" = "follow" ]; then
            tail -f "$LOG_FILE"
        else
            cat "$LOG_FILE"
        fi
    else
        log_warning "No log file found at $LOG_FILE"
    fi
}

# Main command handling
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    test)
        test_calendar
        ;;
    help|--help|-h)
        echo "Tutorwise Calendar Polling Service"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|test|help}"
        echo ""
        echo "Commands:"
        echo "  start    Start the calendar polling service"
        echo "  stop     Stop the calendar polling service"
        echo "  restart  Restart the calendar polling service"
        echo "  status   Show service status and recent logs"
        echo "  logs     Show all logs (use 'logs follow' to tail)"
        echo "  test     Test Google Calendar connection"
        echo "  help     Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  GOOGLE_SERVICE_ACCOUNT_PATH  Path to Google service account JSON"
        echo "  GOOGLE_CALENDAR_IDS          Comma-separated calendar IDs"
        echo ""
        echo "Files:"
        echo "  Log file: $LOG_FILE"
        echo "  PID file: $PID_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|test|help}"
        exit 1
        ;;
esac

exit $?