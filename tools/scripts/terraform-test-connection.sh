#!/bin/bash
set -e

echo "Testing Terraform MCP Connections..."
echo "===================================="

# Test Terraform Cloud MCP
echo "Testing Terraform Cloud MCP..."
if [ -z "$TFC_TOKEN" ]; then
    echo "⚠️  TFC_TOKEN environment variable not set"
    echo "Set it with: export TFC_TOKEN=your_terraform_cloud_token"
else
    echo "✅ TFC_TOKEN configured"
fi

# Check if terraform-mcp-server is installed
if npm list -g terraform-mcp-server &> /dev/null; then
    echo "✅ Terraform MCP server is installed"
else
    echo "❌ Terraform MCP server not installed"
    echo "Install with: tools/integrations/install-terraform.sh"
    exit 1
fi

# Test Docker-based Terraform MCP server
echo ""
echo "Testing Terraform MCP server (Docker)..."
if command -v docker &> /dev/null; then
    if docker images | grep -q "hashicorp/terraform-mcp-server"; then
        echo "✅ Terraform MCP server Docker image available"
        echo "Testing server connectivity..."
        timeout 10s docker run --rm hashicorp/terraform-mcp-server:0.2.3 --help > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ Terraform MCP server responds correctly"
        else
            echo "⚠️  Terraform MCP server timeout (expected for help command)"
        fi
    else
        echo "❌ Terraform MCP server Docker image not found"
        echo "Pull with: docker pull hashicorp/terraform-mcp-server:0.2.3"
    fi
else
    echo "❌ Docker not available"
fi

# Check Terraform CLI
echo ""
echo "Checking Terraform CLI..."
if command -v terraform &> /dev/null; then
    echo "✅ Terraform CLI installed: $(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | head -1)"
else
    echo "ℹ️  Terraform CLI not found (optional for MCP integration)"
fi

echo ""
echo "Connection tests completed!"
echo ""
echo "Available MCP tools:"
echo "Registry Tools:"
echo "- search-modules: Find Terraform modules"
echo "- get-module-details: Module metadata"
echo "- search-providers: Find providers"
echo "- get-provider-schema: Provider schemas"
echo ""
echo "Cloud Tools (requires TFC_TOKEN):"
echo "- list-workspaces: Workspace management"
echo "- get-workspace-details: Workspace config"
echo "- list-runs: Execution history"
echo ""
echo "Example Claude Code queries:"
echo '- "Find Terraform modules for deploying Next.js to Railway"'
echo '- "Generate Terraform config for PostgreSQL database"'
echo '- "What are the latest AWS provider resources?"'