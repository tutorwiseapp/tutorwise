#!/usr/bin/env node
/**
 * Context Engineering Tool for Tutorwise Monorepo
 * Generates comprehensive context maps for AI-assisted development
 */

const fs = require('fs');
const path = require('path');

console.log('🧠 Generating context maps for Tutorwise monorepo...');

// Configuration
const ROOT_DIR = process.cwd();
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const CLAUDE_DIR = path.join(ROOT_DIR, '.claude');

// Context generation functions
function analyzeComponentStructure() {
  console.log('📊 Analyzing component structure...');

  const webComponentsDir = path.join(APPS_DIR, 'web', 'src', 'app', 'components');
  if (!fs.existsSync(webComponentsDir)) return {};

  const componentMap = {};

  function scanDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      if (item.isDirectory()) {
        const subPath = path.join(dir, item.name);
        componentMap[`${prefix}${item.name}/`] = {
          type: 'directory',
          path: subPath.replace(ROOT_DIR, ''),
          children: []
        };
        scanDirectory(subPath, `${prefix}${item.name}/`);
      } else if (item.name.endsWith('.tsx')) {
        const componentName = item.name.replace('.tsx', '');
        const fullPath = path.join(dir, item.name);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Extract imports and exports
        const imports = content.match(/import.*from.*['"]([^'"]+)['"]/g) || [];
        const exports = content.match(/export.*(?:function|const|class)\s+(\w+)/g) || [];

        componentMap[`${prefix}${componentName}`] = {
          type: 'component',
          path: fullPath.replace(ROOT_DIR, ''),
          imports: imports.map(imp => imp.match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean),
          exports: exports.map(exp => exp.match(/(?:function|const|class)\s+(\w+)/)?.[1]).filter(Boolean),
          hasStyles: fs.existsSync(path.join(dir, `${componentName}.module.css`)),
          size: content.length
        };
      }
    });
  }

  scanDirectory(webComponentsDir);
  return componentMap;
}

function analyzeAPIRoutes() {
  console.log('🔌 Analyzing API routes...');

  const apiDir = path.join(APPS_DIR, 'web', 'src', 'app', 'api');
  if (!fs.existsSync(apiDir)) return {};

  const routeMap = {};

  function scanAPIDirectory(dir, routePath = '/api') {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      if (item.isDirectory()) {
        const subPath = path.join(dir, item.name);
        const newRoutePath = item.name.startsWith('[')
          ? `${routePath}/:${item.name.slice(1, -1)}`
          : `${routePath}/${item.name}`;
        scanAPIDirectory(subPath, newRoutePath);
      } else if (item.name === 'route.ts') {
        const fullPath = path.join(dir, item.name);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Extract HTTP methods
        const methods = [];
        if (content.includes('export async function GET')) methods.push('GET');
        if (content.includes('export async function POST')) methods.push('POST');
        if (content.includes('export async function PUT')) methods.push('PUT');
        if (content.includes('export async function DELETE')) methods.push('DELETE');
        if (content.includes('export async function PATCH')) methods.push('PATCH');

        // Extract purpose from comments
        const purposeMatch = content.match(/@purpose\s+(.+)/);
        const authMatch = content.match(/@auth\s+(.+)/);
        const dbMatch = content.match(/@database\s+(.+)/);

        routeMap[routePath] = {
          path: fullPath.replace(ROOT_DIR, ''),
          methods,
          purpose: purposeMatch?.[1] || 'No description',
          auth: authMatch?.[1] || 'Unknown',
          database: dbMatch?.[1] || 'Unknown',
          size: content.length
        };
      }
    });
  }

  scanAPIDirectory(apiDir);
  return routeMap;
}

function analyzeSharedTypes() {
  console.log('🔷 Analyzing shared types...');

  const typesFile = path.join(PACKAGES_DIR, 'shared-types', 'src', 'index.ts');
  if (!fs.existsSync(typesFile)) return {};

  const content = fs.readFileSync(typesFile, 'utf8');

  // Extract type definitions
  const interfaces = content.match(/export interface\s+(\w+)/g) || [];
  const types = content.match(/export type\s+(\w+)/g) || [];
  const enums = content.match(/export enum\s+(\w+)/g) || [];

  return {
    interfaces: interfaces.map(int => int.match(/interface\s+(\w+)/)?.[1]).filter(Boolean),
    types: types.map(type => type.match(/type\s+(\w+)/)?.[1]).filter(Boolean),
    enums: enums.map(enm => enm.match(/enum\s+(\w+)/)?.[1]).filter(Boolean),
    totalSize: content.length
  };
}

function generateDependencyGraph() {
  console.log('🕸️  Generating dependency graph...');

  const componentMap = analyzeComponentStructure();
  const graph = {};

  Object.entries(componentMap).forEach(([name, component]) => {
    if (component.type === 'component') {
      graph[name] = {
        dependencies: component.imports.filter(imp =>
          imp.startsWith('@/') || imp.startsWith('@tutorwise/')
        ),
        dependents: []
      };
    }
  });

  // Calculate dependents
  Object.entries(graph).forEach(([name, node]) => {
    node.dependencies.forEach(dep => {
      const depName = dep.replace('@/', '').replace('@tutorwise/', '');
      if (graph[depName]) {
        graph[depName].dependents.push(name);
      }
    });
  });

  return graph;
}

function generateContextSummary() {
  console.log('📋 Generating context summary...');

  const components = analyzeComponentStructure();
  const routes = analyzeAPIRoutes();
  const types = analyzeSharedTypes();
  const dependencies = generateDependencyGraph();

  const summary = {
    timestamp: new Date().toISOString(),
    overview: {
      totalComponents: Object.keys(components).filter(k => components[k].type === 'component').length,
      totalDirectories: Object.keys(components).filter(k => components[k].type === 'directory').length,
      totalAPIRoutes: Object.keys(routes).length,
      totalSharedTypes: types.interfaces?.length + types.types?.length + types.enums?.length || 0
    },
    components,
    routes,
    sharedTypes: types,
    dependencyGraph: dependencies,
    architecture: {
      frontend: 'Next.js 13+ with App Router',
      backend: 'FastAPI with Python 3.12+',
      database: 'Supabase PostgreSQL + Neo4j + Redis',
      deployment: 'Vercel (frontend) + Railway (backend)',
      monorepo: 'npm workspaces'
    }
  };

  return summary;
}

function generateAIContextFile() {
  console.log('🤖 Generating AI context file...');

  const summary = generateContextSummary();

  const aiContext = `# Tutorwise Codebase Context Map
Generated: ${summary.timestamp}

## Quick Stats
- Components: ${summary.overview.totalComponents}
- API Routes: ${summary.overview.totalAPIRoutes}
- Shared Types: ${summary.overview.totalSharedTypes}

## Key Components

### Layout Components
${Object.entries(summary.components)
  .filter(([name, comp]) => comp.type === 'component' && name.includes('layout'))
  .map(([name, comp]) => `- **${name}**: ${comp.path}`)
  .join('\n')}

### UI Components
${Object.entries(summary.components)
  .filter(([name, comp]) => comp.type === 'component' && name.includes('ui'))
  .slice(0, 10)
  .map(([name, comp]) => `- **${name}**: ${comp.path}`)
  .join('\n')}

## API Routes
${Object.entries(summary.routes)
  .slice(0, 10)
  .map(([route, info]) => `- **${info.methods.join(', ')}** \`${route}\`: ${info.purpose}`)
  .join('\n')}

## Shared Types
- Interfaces: ${summary.sharedTypes.interfaces?.join(', ') || 'None'}
- Types: ${summary.sharedTypes.types?.join(', ') || 'None'}
- Enums: ${summary.sharedTypes.enums?.join(', ') || 'None'}

## High-Impact Components
${Object.entries(summary.dependencyGraph)
  .sort((a, b) => b[1].dependents.length - a[1].dependents.length)
  .slice(0, 5)
  .map(([name, node]) => `- **${name}**: ${node.dependents.length} dependents`)
  .join('\n')}

## Architecture
- **Frontend**: ${summary.architecture.frontend}
- **Backend**: ${summary.architecture.backend}
- **Database**: ${summary.architecture.database}
- **Deployment**: ${summary.architecture.deployment}

This context map helps AI assistants understand the codebase structure and relationships.
`;

  return aiContext;
}

function writeContextFiles(summary) {
  console.log('💾 Writing context files...');

  // Write comprehensive context map
  const contextMapPath = path.join(CLAUDE_DIR, 'codebase-context-map.json');
  fs.writeFileSync(contextMapPath, JSON.stringify(summary, null, 2));
  console.log(`  ✅ Wrote ${contextMapPath}`);

  // Write AI-friendly context
  const aiContextPath = path.join(CLAUDE_DIR, 'ai-context-summary.md');
  const aiContext = generateAIContextFile();
  fs.writeFileSync(aiContextPath, aiContext);
  console.log(`  ✅ Wrote ${aiContextPath}`);

  // Write dependency graph
  const depGraphPath = path.join(CLAUDE_DIR, 'dependency-graph.json');
  fs.writeFileSync(depGraphPath, JSON.stringify(summary.dependencyGraph, null, 2));
  console.log(`  ✅ Wrote ${depGraphPath}`);
}

// Main execution
function main() {
  try {
    const summary = generateContextSummary();
    writeContextFiles(summary);

    console.log('\n🎉 Context generation complete!');
    console.log('📂 Generated files:');
    console.log('  - .claude/codebase-context-map.json (comprehensive data)');
    console.log('  - .claude/ai-context-summary.md (AI-friendly overview)');
    console.log('  - .claude/dependency-graph.json (component relationships)');
    console.log('\n💡 Use these files to:');
    console.log('  - Understand codebase structure');
    console.log('  - Find component relationships');
    console.log('  - Get AI assistance with better context');
    console.log('  - Plan refactoring efforts');

  } catch (error) {
    console.error('❌ Context generation failed:', error.message);
    console.log('🔧 Check file permissions and directory structure');
  }
}

main();