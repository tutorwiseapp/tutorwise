# Tutorwise Packages

This directory contains shared packages for the Tutorwise monorepo. These packages provide reusable code, types, and components that are shared across multiple applications within the workspace.

## Package Structure

### Current Packages

**shared-types/** - TypeScript type definitions shared across applications
- User types and interfaces
- API response types
- Business logic types
- Database schema types
- Utility types for common operations

**ui/** (Future) - Shared React components library
- Reusable UI components
- Design system implementation
- Common styling and theming
- Cross-application component library

## Package Development Standards

### Package Organization

**Directory Structure**
Each package should follow this structure:
```
package-name/
├── src/                    # Source code
│   ├── index.ts           # Main export file
│   ├── types/             # Type definitions (if applicable)
│   └── components/        # Components (for UI packages)
├── dist/                  # Built output (auto-generated)
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # Package documentation
```

**Naming Conventions**
- Package names: `@tutorwise/package-name`
- Directory names: Use kebab-case (e.g., `shared-types`, `ui-components`)
- Export names: Use camelCase or PascalCase as appropriate

### Package Configuration

**package.json Requirements**
```json
{
  "name": "@tutorwise/package-name",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**TypeScript Configuration**
Each package should have its own `tsconfig.json` that extends the root configuration:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

### Development Guidelines

**Code Quality Standards**
- Use TypeScript for all packages
- Implement comprehensive type definitions
- Follow consistent naming conventions
- Include JSDoc comments for public APIs
- Maintain backward compatibility when possible

**Export Strategy**
- Use barrel exports (index.ts) for clean imports
- Export only public APIs
- Organize exports by category when appropriate
- Provide both named and default exports as needed

**Testing Requirements**
- Unit tests for all public functions and components
- Type tests for complex type definitions
- Integration tests for cross-package dependencies
- Test coverage should exceed 80%

### Package Types

**Type Packages**
- Define interfaces and types shared across applications
- Include utility types and type guards
- Provide type validation functions
- Document type usage and examples

**Component Packages**
- Implement reusable React components
- Include comprehensive prop types and documentation
- Provide styled and unstyled variants
- Support theming and customization

**Utility Packages**
- Business logic functions shared across apps
- Data transformation utilities
- Common validation functions
- API client implementations

### Version Management

**Versioning Strategy**
- Use semantic versioning (SemVer)
- Coordinate versions across related packages
- Document breaking changes in CHANGELOG.md
- Use workspace protocols for internal dependencies

**Release Process**
1. Update package version in package.json
2. Build package: `npm run build`
3. Update CHANGELOG.md with changes
4. Test package in consuming applications
5. Commit changes with descriptive message

### Dependencies

**Dependency Management**
- Minimize external dependencies
- Use peer dependencies for framework packages
- Keep dependencies up-to-date
- Document dependency rationale

**Internal Dependencies**
- Use workspace protocol for internal packages
- Maintain clear dependency graphs
- Avoid circular dependencies
- Document inter-package relationships

## Workspace Integration

### Build Process

**Development Workflow**
```bash
# Install dependencies for all packages
npm install

# Build all packages
npm run build:packages

# Build specific package
npm run build --workspace=@tutorwise/shared-types

# Watch mode for development
npm run dev --workspace=@tutorwise/shared-types
```

**Integration with Applications**
- Applications import packages using workspace names
- Build packages before building applications
- Use TypeScript project references for optimal builds
- Implement proper module resolution

### Documentation Requirements

**Package Documentation**
Each package must include:
- Clear README.md with usage examples
- API documentation for all exports
- Installation and setup instructions
- Examples and common use cases
- Troubleshooting guidelines

**Code Documentation**
- JSDoc comments for all public APIs
- Type annotations and descriptions
- Usage examples in comments
- Parameter and return value documentation

## Maintenance and Updates

### Regular Maintenance

**After Major Project Changes**
- Review and update type definitions
- Verify compatibility with applications
- Update dependencies and peer dependencies
- Refresh documentation and examples
- Test package builds and imports

**Continuous Improvement**
- Refactor common code into packages
- Extract reusable components and utilities
- Optimize build performance
- Monitor package size and performance

### Quality Assurance

**Before Publishing Changes**
- [ ] Build succeeds without errors
- [ ] All tests pass
- [ ] Documentation is current
- [ ] Version is updated appropriately
- [ ] Breaking changes are documented
- [ ] Applications can import successfully
- [ ] No circular dependencies introduced

### Migration Strategy

**Adding New Packages**
1. Create package directory structure
2. Set up package.json and TypeScript config
3. Implement core functionality
4. Add comprehensive tests
5. Update workspace configuration
6. Document usage and integration

**Removing Packages**
1. Identify all consumers of the package
2. Migrate functionality to alternative solutions
3. Update import statements in applications
4. Remove package from workspace configuration
5. Archive or delete package directory

## Best Practices

### Design Principles

**Single Responsibility**
- Each package should have a clear, focused purpose
- Avoid mixing unrelated functionality
- Keep packages cohesive and maintainable

**API Design**
- Design intuitive and consistent APIs
- Provide good defaults and optional configurations
- Use TypeScript to enforce correct usage
- Consider future extensibility

**Performance**
- Optimize for bundle size and runtime performance
- Use tree-shaking friendly exports
- Minimize runtime dependencies
- Profile and benchmark critical paths

### Security Considerations

**Code Security**
- Validate all inputs and parameters
- Avoid exposing sensitive information
- Use secure defaults for configurations
- Regular security audits of dependencies

**Access Control**
- All packages are internal to the monorepo
- No external publication to npm registry
- Workspace-only distribution and access

This package system ensures that Tutorwise maintains high-quality, reusable code that supports efficient development across all applications while maintaining consistency and reducing duplication.