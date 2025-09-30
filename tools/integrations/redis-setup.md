# Redis MCP Integration Setup

Redis Model Context Protocol integration for Claude Code access to Railway Redis and local Redis instances.

## Overview

Enables Claude Code to interact with Redis databases through natural language, providing data operations, caching management, and Railway Redis cloud integration.

## Prerequisites

- Redis instance (local, Railway, or Redis Cloud)
- Claude Code with MCP support
- Railway account (for Railway Redis)

## Installation

Use the integration management system:

```bash
# Install Redis MCP server
tools/integrations/install-redis.sh

# Or via npm
cd tools && npm run install:redis
```

## Configuration

### Local Redis Configuration

```bash
# Required environment variables
export REDIS_URL=redis://localhost:6379
export REDIS_PASSWORD=your_password
```

### Railway Redis Configuration

```bash
# Railway Redis environment variables
export RAILWAY_TOKEN=your_railway_token
export REDIS_URL=${{Redis.REDIS_URL}}
export REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

## Usage

```bash
# Test Redis connection
tools/scripts/redis-test-connection.sh

# Data operations
tools/scripts/redis-data-management.sh

# Railway Redis management
tools/scripts/railway-redis-management.sh
```

## MCP Configuration

Add to Claude Code MCP settings:

```json
{
  "mcpServers": {
    "redis": {
      "command": "npx",
      "args": ["mcp-redis"],
      "env": {
        "REDIS_URL": "redis://localhost:6379",
        "REDIS_PASSWORD": "your_password"
      }
    },
    "railway": {
      "command": "npx",
      "args": ["railway-mcp"],
      "env": {
        "RAILWAY_TOKEN": "your_railway_token"
      }
    }
  }
}
```

## Available Tools

### Redis Tools
- `redis-get` - Retrieve key values
- `redis-set` - Set key-value pairs
- `redis-delete` - Remove keys
- `redis-search` - Search operations
- `redis-health` - Database health check

### Railway Tools
- `railway-deploy` - Deploy services
- `railway-logs` - View logs
- `railway-env` - Manage environment variables
- `railway-status` - Service status

## Use Cases

- Session management
- Conversation history storage
- Real-time caching
- Rate limiting
- Semantic search for RAG
- Development environment management

## Related Files

- `tools/integrations/install-redis.sh` - Installation script
- `tools/scripts/redis-*.sh` - Operational scripts
- `tools/scripts/railway-redis-*.sh` - Railway-specific scripts
- `tools/package.json` - npm scripts configuration
- `tools/integration-status.json` - Integration tracking