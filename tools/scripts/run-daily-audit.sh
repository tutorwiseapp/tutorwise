#!/bin/bash

# Daily Project Audit Runner
# This script is designed to be run by cron to execute daily project audits

# Set the working directory to the project root
cd /Users/michaelquan/projects/tutorwise

# Create logs directory if it doesn't exist
mkdir -p logs

# Log the start time
echo "===========================================" >> logs/audit-cron.log
echo "Daily Audit Started: $(date)" >> logs/audit-cron.log
echo "===========================================" >> logs/audit-cron.log

# Run the project audit script with 'y' response to any prompts
echo 'y' | ./tools/scripts/project-audit.sh daily >> logs/audit-cron.log 2>&1

# Log the completion
echo "Daily Audit Completed: $(date)" >> logs/audit-cron.log
echo "===========================================" >> logs/audit-cron.log
echo "" >> logs/audit-cron.log