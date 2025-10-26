#!/usr/bin/env node
/**
 * Fix JSON with comments for migration
 * Removes comments from tsconfig.json before processing
 */

import * as fs from 'fs';
import { fileURLToPath } from 'url';

export function stripJsonComments(jsonString: string): string {
  // Remove single-line comments and trailing commas
  return jsonString
    .replace(/\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1');
}

export function fixTsConfig(): boolean {
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
    } catch (error: any) {
      console.error('  ❌ Still invalid JSON:', error.message);
      return false;
    }
  }

  return false;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fixTsConfig();
}