#!/bin/bash

# Protection Report Runner
# This script is designed to be run by cron to execute protection reports and send emails

# Set the working directory to the project root
cd /Users/michaelquan/projects/tutorwise

# Create logs directory if it doesn't exist
mkdir -p logs

# Log the start time
echo "===========================================" >> logs/protection-report-cron.log
echo "Protection Report Started: $(date)" >> logs/protection-report-cron.log
echo "===========================================" >> logs/protection-report-cron.log

# Run the protection report email script
node tools/scripts/email/send-protection-report-email.js >> logs/protection-report-cron.log 2>&1

EXIT_CODE=$?

# Log the completion
echo "Protection Report Completed: $(date)" >> logs/protection-report-cron.log
echo "Exit Code: $EXIT_CODE" >> logs/protection-report-cron.log
echo "===========================================" >> logs/protection-report-cron.log
echo "" >> logs/protection-report-cron.log

exit $EXIT_CODE
