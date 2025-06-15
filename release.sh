#!/bin/bash

# Ask for version type to bump (patch, minor, major)
echo "What kind of release? (patch, minor, major)"
read VERSION_TYPE

# Validate input
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Invalid version type. Please use 'patch', 'minor', or 'major'."
  exit 1
fi

# Run npm version to update version in package.json
npm version $VERSION_TYPE

# Get the new version number from package.json
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: v$NEW_VERSION"

# Package the extension
vsce package

# Prompt to publish
echo "Do you want to publish to VS Code Marketplace? (y/n)"
read PUBLISH

if [[ "$PUBLISH" == "y" ]]; then
  echo "Enter your Personal Access Token:"
  read -s PAT
  
  # Publish to marketplace
  vsce publish -p $PAT
  
  echo "Extension published to VS Code Marketplace!"
fi

# Prompt to push to GitHub
echo "Do you want to push changes to GitHub? (y/n)"
read PUSH_TO_GITHUB

if [[ "$PUSH_TO_GITHUB" == "y" ]]; then
  # Push changes and tags to GitHub
  git push && git push --tags
  
  echo "Changes pushed to GitHub!"
fi

echo "Release process completed!"
