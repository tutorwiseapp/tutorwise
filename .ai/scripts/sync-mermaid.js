#!/usr/bin/env node

/**
 * Mermaid Diagram Sync Runner
 * Syncs Mermaid diagrams to .ai/mermaid/ for context engineering
 */

// Note: This requires the TypeScript file to be transpiled or use ts-node
// For now, we'll create a simple implementation
const fs = require('fs').promises;
const path = require('path');

async function main() {
  try {
    console.log('🚀 Starting Mermaid diagram sync...');

    // Configuration from environment and defaults
    const diagramPaths = (process.env.MERMAID_DIAGRAM_PATHS || 'docs,src,components,.ai').split(',').filter(path => path.trim());
    const includePatterns = process.env.MERMAID_INCLUDE_PATTERNS ? process.env.MERMAID_INCLUDE_PATTERNS.split(',') : [];
    const excludePatterns = process.env.MERMAID_EXCLUDE_PATTERNS ? process.env.MERMAID_EXCLUDE_PATTERNS.split(',') : ['node_modules', '.git', 'dist', 'build'];

    const config = {
      diagramPaths,
      includePatterns,
      excludePatterns,
      outputFormat: process.env.MERMAID_OUTPUT_FORMAT || 'both'
    };

    console.log(`📁 Scanning paths: ${diagramPaths.join(', ')}`);
    console.log(`📋 Output format: ${config.outputFormat}`);

    // Initialize and run sync
    const sync = new SimpleMermaidSync(config);
    await sync.syncDiagrams();

    console.log('✅ Mermaid diagram sync completed successfully!');
  } catch (error) {
    console.error('❌ Mermaid diagram sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };