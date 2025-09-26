#!/usr/bin/env node

/**
 * Figma Sync Runner
 * Syncs Figma designs to .ai/figma/ for context engineering
 */

const { SimpleFigmaSync } = require('../integrations/simple-figma-sync.ts');

async function main() {
  try {
    console.log('🚀 Starting Figma design sync...');

    // Configuration from environment
    const config = {
      accessToken: process.env.FIGMA_ACCESS_TOKEN,
      fileKeys: (process.env.FIGMA_FILE_KEYS || '').split(',').filter(key => key.trim()),
      includeImages: process.env.FIGMA_INCLUDE_IMAGES === 'true',
      imageFormat: (process.env.FIGMA_IMAGE_FORMAT || 'png') as 'png' | 'jpg' | 'svg',
      imageScale: parseInt(process.env.FIGMA_IMAGE_SCALE || '1', 10)
    };

    // Validate configuration
    if (!config.accessToken) {
      console.error('❌ Missing Figma access token.');
      console.log('Required environment variables:');
      console.log('- FIGMA_ACCESS_TOKEN');
      console.log('- FIGMA_FILE_KEYS (comma-separated)');
      console.log('Optional:');
      console.log('- FIGMA_INCLUDE_IMAGES=true (default: false)');
      console.log('- FIGMA_IMAGE_FORMAT=png|jpg|svg (default: png)');
      console.log('- FIGMA_IMAGE_SCALE=1|2|4 (default: 1)');
      process.exit(1);
    }

    if (!config.fileKeys.length) {
      console.error('❌ No Figma file keys specified.');
      console.log('Set FIGMA_FILE_KEYS environment variable with comma-separated file keys.');
      console.log('Get file keys from Figma URLs: figma.com/file/FILE_KEY/...');
      process.exit(1);
    }

    console.log(`📐 Syncing ${config.fileKeys.length} Figma files...`);
    if (config.includeImages) {
      console.log(`🖼️  Including images (${config.imageFormat}, ${config.imageScale}x scale)`);
    }

    // Initialize and run sync
    const sync = new SimpleFigmaSync(config);
    await sync.syncDesigns();

    console.log('✅ Figma sync completed successfully!');
  } catch (error) {
    console.error('❌ Figma sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };