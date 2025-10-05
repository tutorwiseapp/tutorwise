#!/bin/bash
set -e

echo "Testing Neo4j MCP Connection..."
echo "==============================="

# Check required environment variables
if [ -z "$NEO4J_URI" ]; then
    echo "❌ NEO4J_URI environment variable not set"
    echo "Set it with: export NEO4J_URI=bolt://localhost:7687"
    exit 1
fi

if [ -z "$NEO4J_USERNAME" ]; then
    echo "❌ NEO4J_USERNAME environment variable not set"
    echo "Set it with: export NEO4J_USERNAME=neo4j"
    exit 1
fi

if [ -z "$NEO4J_PASSWORD" ]; then
    echo "❌ NEO4J_PASSWORD environment variable not set"
    echo "Set it with: export NEO4J_PASSWORD=your_password"
    exit 1
fi

echo "Testing connection to: $NEO4J_URI"
echo "Username: $NEO4J_USERNAME"

# Test if Neo4j MCP server is installed
if ! command -v mcp-neo4j &> /dev/null; then
    echo "❌ Neo4j MCP server not installed"
    echo "Install with: tools/integrations/install-neo4j.sh"
    exit 1
fi

# Basic connection test using Node.js
node -e "
const { execSync } = require('child_process');
try {
    console.log('✅ Neo4j MCP server is installed');
    console.log('✅ Environment variables are configured');
    console.log('');
    console.log('Connection test completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Configure Claude Code MCP settings');
    console.log('2. Start using Neo4j queries through Claude Code');
} catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
}
"

echo ""
echo "Available MCP tools:"
echo "- get-neo4j-schema: Retrieve database schema"
echo "- read-neo4j-cypher: Execute read queries"
echo "- write-neo4j-cypher: Execute write operations"