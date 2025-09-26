#!/usr/bin/env node

/**
 * Confluence Sync Runner
 * Syncs Confluence pages to .ai/confluence/ for context engineering
 */

const { SimpleConfluenceSync } = require('../integrations/simple-confluence-sync.ts');

async function main() {
  try {
    console.log('🚀 Starting Confluence sync...');

    // Configuration from environment
    const config = {
      baseUrl: process.env.CONFLUENCE_BASE_URL,
      email: process.env.CONFLUENCE_EMAIL,
      apiToken: process.env.CONFLUENCE_API_TOKEN,
      spaceKeys: (process.env.CONFLUENCE_SPACE_KEYS || '').split(',').filter(key => key.trim()),
      pageIds: (process.env.CONFLUENCE_PAGE_IDS || '').split(',').filter(id => id.trim())
    };

    // Validate configuration
    if (!config.baseUrl || !config.email || !config.apiToken) {
      console.error('❌ Missing Confluence configuration.');
      console.log('Required environment variables:');
      console.log('- CONFLUENCE_BASE_URL (e.g., https://your-domain.atlassian.net)');
      console.log('- CONFLUENCE_EMAIL');
      console.log('- CONFLUENCE_API_TOKEN');
      console.log('Optional:');
      console.log('- CONFLUENCE_SPACE_KEYS (comma-separated)');
      console.log('- CONFLUENCE_PAGE_IDS (comma-separated)');
      process.exit(1);
    }

    if (!config.spaceKeys.length && !config.pageIds.length) {
      console.error('❌ No space keys or page IDs specified.');
      console.log('Set CONFLUENCE_SPACE_KEYS and/or CONFLUENCE_PAGE_IDS environment variables.');
      process.exit(1);
    }

    // Initialize and run sync
    const sync = new SimpleConfluenceSync(config);
    await sync.syncPages();

    console.log('✅ Confluence sync completed successfully!');
  } catch (error) {
    console.error('❌ Confluence sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };