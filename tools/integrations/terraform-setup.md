# Terraform MCP Integration Setup

Terraform Model Context Protocol integration for Claude Code-driven Infrastructure as Code development.

## Overview

Enables Claude Code to interact with Terraform Registry APIs, generate context-aware infrastructure code, and manage IaC workflows through natural language conversations.

## Prerequisites

- Claude Code with MCP support
- Terraform installed locally
- Terraform Cloud account (optional)
- Docker (for containerized setup)

## Installation

Use the integration management system:

```bash
# Install Terraform MCP server
tools/integrations/install-terraform.sh

# Or via npm
cd tools && npm run install:terraform
```

## Configuration

### Terraform Cloud Integration

```bash
# Required environment variables
export TFC_TOKEN=your_terraform_cloud_token
export ENABLE_DELETE_TOOLS=false
```

### Local Terraform Setup

```bash
# Terraform CLI configuration
export TF_VAR_project_name=tutorwise
export TF_VAR_environment=production
```

## Usage

```bash
# Test Terraform integration
tools/scripts/terraform-test-connection.sh

# Generate infrastructure code
tools/scripts/terraform-generate-iac.sh

# Plan and apply infrastructure
tools/scripts/terraform-deploy.sh
```

## MCP Configuration

Add to Claude Code MCP settings:

```json
{
  "mcpServers": {
    "terraform": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "hashicorp/terraform-mcp-server:0.2.3"
      ]
    },
    "terraform-cloud": {
      "command": "terraform-cloud-mcp",
      "env": {
        "TFC_TOKEN": "your_terraform_cloud_token",
        "ENABLE_DELETE_TOOLS": "false"
      }
    }
  }
}
```

## Available Tools

### Terraform Registry Tools
- `search-modules` - Find Terraform modules
- `get-module-details` - Module metadata and versions
- `search-providers` - Find Terraform providers
- `get-provider-schema` - Provider resource schemas

### Terraform Cloud Tools
- `list-workspaces` - Workspace management
- `get-workspace-details` - Workspace configuration
- `list-runs` - Execution history
- `create-workspace` - Workspace provisioning

## IaC Workflows

### 1. Infrastructure Discovery
Ask Claude Code: "What Terraform modules are available for deploying Next.js applications to Railway?"

### 2. Code Generation
Ask Claude Code: "Generate Terraform configuration for TutorWise production environment with PostgreSQL database"

### 3. Best Practices
Ask Claude Code: "Review this Terraform code and suggest improvements following current best practices"

## Use Cases

- **Multi-cloud deployment** configurations
- **Database infrastructure** provisioning
- **CI/CD pipeline** automation
- **Security and compliance** configurations
- **Cost optimization** strategies

## Related Files

- `tools/integrations/install-terraform.sh` - Installation script
- `tools/scripts/terraform-*.sh` - Operational scripts
- `tools/terraform/` - Terraform configuration files
- `tools/package.json` - npm scripts configuration
- `tools/integration-status.json` - Integration tracking