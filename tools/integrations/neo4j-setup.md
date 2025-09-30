# Neo4j MCP Integration Setup

Neo4j Model Context Protocol integration for Claude Code access to graph database operations.

## Overview

Enables Claude Code to interact with Neo4j graph databases through natural language, providing schema introspection, Cypher query generation, and graph data operations.

## Prerequisites

- Neo4j database instance (local, cloud, or Aura)
- Claude Code with MCP support
- Node.js environment

## Installation

Use the integration management system:

```bash
# Install Neo4j MCP server
tools/integrations/install-neo4j.sh

# Or via npm
cd tools && npm run install:neo4j
```

## Configuration

Configure connection via environment variables:

```bash
# Required environment variables
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=your_password

# For Neo4j Aura
export NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
```

## Usage

```bash
# Test Neo4j connection
tools/scripts/neo4j-test-connection.sh

# Query graph database
tools/scripts/neo4j-query.sh

# Schema operations
tools/scripts/neo4j-schema-management.sh
```

## MCP Configuration

Add to Claude Code MCP settings:

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "npx",
      "args": ["@neo4j-contrib/mcp-neo4j"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "your_password"
      }
    }
  }
}
```

## Available Tools

- `get-neo4j-schema` - Retrieve database schema
- `read-neo4j-cypher` - Execute read queries
- `write-neo4j-cypher` - Execute write operations
- `graph-algorithms` - Run graph analytics

## Related Files

- `tools/integrations/install-neo4j.sh` - Installation script
- `tools/scripts/neo4j-*.sh` - Operational scripts
- `tools/package.json` - npm scripts configuration
- `tools/integration-status.json` - Integration tracking