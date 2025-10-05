#!/usr/bin/env node

/**
 * Fetch Figma design file information
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

const config = {
  accessToken: process.env.FIGMA_ACCESS_TOKEN,
  fileKey: process.env.FIGMA_FILE_KEYS
};

async function fetchFigmaFile(fileKey) {
  try {
    if (!config.accessToken || !config.fileKey) {
      console.error('❌ Missing Figma credentials. Ensure FIGMA_ACCESS_TOKEN and FIGMA_FILE_KEYS are set in .env.local');
      process.exit(1);
    }

    const api = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': config.accessToken
      }
    });

    console.log(`🎨 Fetching Figma file ${fileKey}...`);

    // Get file metadata
    const fileResponse = await api.get(`/files/${fileKey}`);
    const file = fileResponse.data;

    console.log('\n📄 === File Information ===');
    console.log(`Name: ${file.name}`);
    console.log(`Last Modified: ${file.lastModified}`);
    console.log(`Version: ${file.version}`);
    console.log(`Thumbnail: ${file.thumbnailUrl || 'N/A'}`);

    console.log('\n📑 === Pages ===');
    if (file.document && file.document.children) {
      file.document.children.forEach((page, index) => {
        console.log(`\n${index + 1}. ${page.name}`);
        if (page.children) {
          console.log(`   Frames: ${page.children.length}`);
          page.children.slice(0, 10).forEach((frame, i) => {
            console.log(`   - ${frame.name} (${frame.type})`);
          });
          if (page.children.length > 10) {
            console.log(`   ... and ${page.children.length - 10} more`);
          }
        }
      });
    }

    // Get comments if any
    try {
      const commentsResponse = await api.get(`/files/${fileKey}/comments`);
      const comments = commentsResponse.data.comments || [];

      console.log(`\n💬 === Comments === (${comments.length} total)`);
      if (comments.length > 0) {
        comments.slice(0, 5).forEach((comment, i) => {
          console.log(`\n${i + 1}. ${comment.user.handle}`);
          console.log(`   "${comment.message}"`);
          console.log(`   Created: ${comment.created_at}`);
        });
        if (comments.length > 5) {
          console.log(`\n... and ${comments.length - 5} more comments`);
        }
      }
    } catch (e) {
      console.log('\n💬 Comments: Unable to fetch (may not have permission)');
    }

    // Save summary to file
    const summary = {
      name: file.name,
      lastModified: file.lastModified,
      version: file.version,
      thumbnailUrl: file.thumbnailUrl,
      pages: file.document.children.map(page => ({
        name: page.name,
        type: page.type,
        frameCount: page.children ? page.children.length : 0,
        frames: page.children ? page.children.slice(0, 20).map(f => ({
          name: f.name,
          type: f.type
        })) : []
      }))
    };

    const outputPath = path.join(__dirname, '../../../docs/design/figma-design-summary.json');
    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
    console.log(`\n✅ Summary saved to ${outputPath}`);

    return file;

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.err || error.message);
    if (error.response?.status === 403) {
      console.error('Access denied. Check your FIGMA_ACCESS_TOKEN permissions.');
    } else if (error.response?.status === 404) {
      console.error(`File ${fileKey} not found. Check FIGMA_FILE_KEYS.`);
    }
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const fileKey = process.argv[2] || config.fileKey;

  if (!fileKey) {
    console.log('Usage: node fetch-figma-design.js [file-key]');
    console.log('File key will default to FIGMA_FILE_KEYS from .env.local');
    process.exit(1);
  }

  fetchFigmaFile(fileKey);
}

module.exports = { fetchFigmaFile };
