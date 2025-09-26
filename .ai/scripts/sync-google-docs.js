#!/usr/bin/env node

/**
 * Google Docs Sync Runner
 * Syncs Google Docs to .ai/google-docs/ for context engineering
 */

const { SimpleGoogleDocsSync } = require('../integrations/simple-google-docs-sync.ts');
const path = require('path');

async function main() {
  try {
    console.log('🚀 Starting Google Docs sync...');

    // Configuration from environment
    const config = {
      credentials: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'google-credentials.json'),
      folderIds: (process.env.GOOGLE_DOCS_FOLDER_IDS || '').split(',').filter(id => id.trim()),
      documentIds: (process.env.GOOGLE_DOCS_DOCUMENT_IDS || '').split(',').filter(id => id.trim())
    };

    // Validate configuration
    if (!config.folderIds.length && !config.documentIds.length) {
      console.error('❌ No folder IDs or document IDs specified.');
      console.log('Set GOOGLE_DOCS_FOLDER_IDS and/or GOOGLE_DOCS_DOCUMENT_IDS environment variables.');
      process.exit(1);
    }

    // Initialize and run sync
    const sync = new SimpleGoogleDocsSync(config);
    await sync.syncDocuments();

    console.log('✅ Google Docs sync completed successfully!');
  } catch (error) {
    console.error('❌ Google Docs sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };