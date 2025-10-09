#!/bin/bash

# Check if jq is installed
if ! [ -x "$(command -v jq)" ]; then
  echo 'Error: jq is not installed.' >&2
  exit 1
fi

# Get a list of all the workspaces
WORKSPACES=$(cat package.json | jq -r '.workspaces[]')

# Check for outdated dependencies in the root directory
echo "Checking for outdated dependencies in the root directory"
npm outdated

# Check for outdated dependencies in each workspace
for WORKSPACE in $WORKSPACES
do
  if [ -d "$WORKSPACE" ]; then
    echo "Checking for outdated dependencies in $WORKSPACE"
    (cd $WORKSPACE && npm outdated)
  fi
done
