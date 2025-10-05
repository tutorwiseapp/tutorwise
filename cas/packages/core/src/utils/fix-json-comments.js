#!/usr/bin/env node
/**
 * Fix JSON with comments for migration
 * Removes comments from tsconfig.json before processing
 */

const fs = require('fs');

function stripJsonComments(jsonString) {
  // Remove single-line comments
  return jsonString
    .replace(/\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
}

function fixTsConfig() {
  console.log('🔧 Fixing tsconfig.json comments...');

  if (fs.existsSync('tsconfig.json')) {
    const content = fs.readFileSync('tsconfig.json', 'utf8');
    const cleaned = stripJsonComments(content);

    try {
      // Test if it parses correctly
      JSON.parse(cleaned);

      // Create clean version for migration
      fs.writeFileSync('tsconfig.clean.json', cleaned);
      console.log('  ✅ Created clean tsconfig.json');

      return true;
    } catch (error) {
      console.error('  ❌ Still invalid JSON:', error.message);
      return false;
    }
  }

  return false;
}

if (require.main === module) {
  fixTsConfig();
}

module.exports = { stripJsonComments, fixTsConfig };