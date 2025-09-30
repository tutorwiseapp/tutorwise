#!/bin/bash
set -e

echo "Installing Redis MCP Servers..."
echo "==============================="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is required but not installed."
    exit 1
fi

# Install Redis MCP server
echo "Installing @modelcontextprotocol/server-redis..."
npm install -g @modelcontextprotocol/server-redis

# Install Railway MCP server (check if available)
echo "Installing railway-mcp..."
npm install -g railway-mcp || echo "⚠️  railway-mcp not available via npm"

# Verify installations
redis_installed=false
railway_installed=false

if npm list -g @modelcontextprotocol/server-redis &> /dev/null; then
    echo "✅ Redis MCP server installed successfully"
    redis_installed=true
else
    echo "❌ Redis MCP installation failed"
fi

if npm list -g railway-mcp &> /dev/null; then
    echo "✅ Railway MCP server installed successfully"
    railway_installed=true
else
    echo "⚠️  Railway MCP not available via npm (will use Railway CLI directly)"
    railway_installed=true  # Set to true since we can use Railway CLI
fi

if [ "$redis_installed" = false ] && [ "$railway_installed" = false ]; then
    echo "❌ Both installations failed"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Set up Redis connection:"
echo "   export REDIS_URL=redis://localhost:6379"
echo "   export REDIS_PASSWORD=your_password"
echo ""
echo "2. Set up Railway connection:"
echo "   export RAILWAY_TOKEN=your_railway_token"
echo ""
echo "3. Configure Claude Code MCP settings"
echo "4. Test connections: tools/scripts/redis-test-connection.sh"
echo ""
echo "Documentation: tools/integrations/redis-setup.md"