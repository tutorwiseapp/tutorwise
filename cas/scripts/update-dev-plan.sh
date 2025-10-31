#!/bin/bash
# cas/scripts/update-dev-plan.sh
# Updates Developer plan with recent commits and current date

PLAN_FILE="/Users/michaelquan/projects/tutorwise/cas/agents/developer/planning/cas-feature-dev-plan.md"
TUTORWISE_ROOT="/Users/michaelquan/projects/tutorwise"

# Get current date
CURRENT_DATE=$(date "+%Y-%m-%d %H:%M:%S")

# Get recent commits from last 7 days
RECENT_WORK=$(cd "$TUTORWISE_ROOT" && git log --oneline --since="7 days ago" --pretty=format:"- %s (%cd)" --date=short | head -10)

# Update the "Last Updated" line in the plan
sed -i "" "s/\*\*Last Updated:\*\* .*/\*\*Last Updated:\*\* $CURRENT_DATE/" "$PLAN_FILE"

echo "✅ Updated Developer Plan timestamp to: $CURRENT_DATE"
echo ""
echo "Recent commits (last 7 days):"
echo "$RECENT_WORK"
echo ""
echo "💡 Tip: Review $PLAN_FILE and manually update feature status based on recent work"
