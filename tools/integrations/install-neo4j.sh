#!/bin/bash
set -e

echo "Installing Neo4j MCP Server..."
echo "============================="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is required but not installed."
    exit 1
fi

# Install Neo4j MCP server
echo "Installing @alanse/mcp-neo4j-server..."
npm install -g @alanse/mcp-neo4j-server

# Verify installation
if npm list -g @alanse/mcp-neo4j-server &> /dev/null; then
    echo "✅ Neo4j MCP server installed successfully"
    echo "Version: $(npm list -g @alanse/mcp-neo4j-server --depth=0 2>/dev/null | grep mcp-neo4j-server || echo 'latest')"
else
    echo "❌ Installation failed - @alanse/mcp-neo4j-server not found"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Set up Neo4j database connection:"
echo "   export NEO4J_URI=bolt://localhost:7687"
echo "   export NEO4J_USERNAME=neo4j"
echo "   export NEO4J_PASSWORD=your_password"
echo ""
echo "2. Configure Claude Code MCP settings"
echo "3. Test connection: tools/scripts/neo4j-test-connection.sh"
echo ""
echo "Documentation: tools/integrations/neo4j-setup.md"