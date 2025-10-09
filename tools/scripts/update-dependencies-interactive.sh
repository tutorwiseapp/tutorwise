#!/bin/bash

# Check if jq is installed
if ! [ -x "$(command -v jq)" ]; then
  echo 'Error: jq is not installed.' >&2
  exit 1
fi

# Get a list of all the workspaces
WORKSPACES=$(cat package.json | jq -r '.workspaces[]')

# Function to update dependencies
update_dependencies() {
  PACKAGE_NAME=$1
  WANTED_VERSION=$2

  echo "Updating $PACKAGE_NAME to version $WANTED_VERSION"
  npm install $PACKAGE_NAME@$WANTED_VERSION

  echo "Running tests..."
  npm test

  read -p "Tests passed. Continue with the next dependency? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]
  then
    exit 1
  fi
}

# Check for outdated dependencies in the root directory
echo "Checking for outdated dependencies in the root directory"
npm outdated | tail -n +2 | while read -r line ; do
  PACKAGE_NAME=$(echo $line | awk '{print $1}')
  WANTED_VERSION=$(echo $line | awk '{print $3}')
  update_dependencies $PACKAGE_NAME $WANTED_VERSION
done

# Check for outdated dependencies in each workspace
for WORKSPACE in $WORKSPACES
do
  if [ -d "$WORKSPACE" ]; then
    echo "Checking for outdated dependencies in $WORKSPACE"
    (cd $WORKSPACE && npm outdated | tail -n +2 | while read -r line ; do
      PACKAGE_NAME=$(echo $line | awk '{print $1}')
      WANTED_VERSION=$(echo $line | awk '{print $3}')
      update_dependencies $PACKAGE_NAME $WANTED_VERSION
    done)
  fi
done

echo "All dependencies have been updated."
