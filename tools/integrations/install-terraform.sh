#!/bin/bash
set -e

echo "Installing Terraform MCP Server..."
echo "================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Warning: Docker not found. Installing terraform-cloud-mcp only."
    echo "For full Terraform MCP server, install Docker and re-run this script."
    docker_available=false
else
    docker_available=true
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is required but not installed."
    exit 1
fi

# Install Terraform MCP server (community npm package)
echo "Installing terraform-mcp-server..."
npm install -g terraform-mcp-server

# Test Docker-based Terraform MCP server
if [ "$docker_available" = true ]; then
    echo "Testing Terraform MCP server (Docker)..."
    docker pull hashicorp/terraform-mcp-server:0.2.3
    if [ $? -eq 0 ]; then
        echo "✅ Terraform MCP server (Docker) ready"
    else
        echo "❌ Failed to pull Terraform MCP server Docker image"
    fi
fi

# Verify Terraform MCP installation
if npm list -g terraform-mcp-server &> /dev/null; then
    echo "✅ Terraform MCP server installed successfully"
else
    echo "❌ Terraform MCP installation failed"
    exit 1
fi

# Check if Terraform CLI is installed
if command -v terraform &> /dev/null; then
    echo "✅ Terraform CLI found: $(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version)"
else
    echo "ℹ️  Terraform CLI not found. Install with:"
    echo "   brew install terraform  # macOS"
    echo "   # or download from https://terraform.io/downloads"
fi

echo ""
echo "Next steps:"
echo "1. Set up Terraform Cloud token:"
echo "   export TFC_TOKEN=your_terraform_cloud_token"
echo ""
echo "2. Configure Claude Code MCP settings"
echo "3. Test connection: tools/scripts/terraform-test-connection.sh"
echo ""
echo "Documentation: tools/integrations/terraform-setup.md"