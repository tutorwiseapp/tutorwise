# Tools Documentation

This folder contains documentation for development tools, automation scripts, and context engineering systems used in the Tutorwise platform.

## Current Documents

- **`context-engineering.md`** - Framework specification for AI-assisted development
- **`context-engineering-implementation.md`** - Implementation details of the context engineering system

## Structure

```
tools/
├── README.md                           # This file
├── context-engineering.md             # Context engineering framework
├── context-engineering-implementation.md # Context system implementation
├── code-generation.md                 # Code generation tools and templates
├── automation-scripts.md              # Build and deployment automation
├── development-workflow.md            # Development tools and workflows
└── monitoring-tools.md                # Monitoring and debugging tools
```

## Available Tools

### Context Engineering
- **AI Context Generation**: `npm run context:generate`
- **Codebase Analysis**: Automated component and API discovery
- **Dependency Mapping**: Component relationship graphs

### Development Scripts
```bash
# Context tools
npm run context:generate    # Generate fresh codebase context
npm run context:update      # Alias for context generation

# Build tools
npm run build              # Production build
npm run dev                # Development server
npm run lint               # Code linting
npm run test               # Run tests
```

## Guidelines

When documenting tools:
1. Include installation and setup instructions
2. Provide usage examples and common commands
3. Document configuration options and customization
4. Include troubleshooting guides
5. Link to related development documentation
6. Update this index when adding new tools

## Related Documentation

- **Development**: See `../development/` for development processes
- **Reference**: See `../reference/` for quick command references
- **Infrastructure**: See `../infrastructure/` for deployment tools