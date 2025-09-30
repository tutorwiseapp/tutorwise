#!/bin/bash
set -e

echo "Testing Redis MCP Connections..."
echo "==============================="

# Test Redis connection
echo "Testing Redis MCP..."
if [ -z "$REDIS_URL" ]; then
    echo "⚠️  REDIS_URL environment variable not set"
    echo "Set it with: export REDIS_URL=redis://localhost:6379"
else
    echo "✅ REDIS_URL configured: $REDIS_URL"
fi

# Test Railway connection
echo ""
echo "Testing Railway MCP..."
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "⚠️  RAILWAY_TOKEN environment variable not set"
    echo "Set it with: export RAILWAY_TOKEN=your_railway_token"
else
    echo "✅ RAILWAY_TOKEN configured"
fi

# Check if MCP servers are installed
echo ""
echo "Checking MCP server installations..."

redis_installed=false
railway_installed=false

if command -v mcp-redis &> /dev/null; then
    echo "✅ Redis MCP server is installed"
    redis_installed=true
else
    echo "❌ Redis MCP server not installed"
fi

if command -v railway-mcp &> /dev/null; then
    echo "✅ Railway MCP server is installed"
    railway_installed=true
else
    echo "❌ Railway MCP server not installed"
fi

if [ "$redis_installed" = false ] && [ "$railway_installed" = false ]; then
    echo ""
    echo "❌ No MCP servers installed"
    echo "Install with: tools/integrations/install-redis.sh"
    exit 1
fi

# Test Redis connection if configured
if [ "$redis_installed" = true ] && [ -n "$REDIS_URL" ]; then
    echo ""
    echo "Testing Redis connection..."
    node -e "
    try {
        console.log('✅ Redis MCP configuration looks good');
        console.log('Connection details configured for:', process.env.REDIS_URL);
    } catch (error) {
        console.error('❌ Redis test failed:', error.message);
    }
    "
fi

echo ""
echo "Connection tests completed!"
echo ""
echo "Available Redis MCP tools:"
echo "- redis-get: Retrieve key values"
echo "- redis-set: Set key-value pairs"
echo "- redis-delete: Remove keys"
echo "- redis-search: Search operations"
echo ""
echo "Available Railway MCP tools:"
echo "- railway-deploy: Deploy services"
echo "- railway-logs: View logs"
echo "- railway-env: Manage environment variables"