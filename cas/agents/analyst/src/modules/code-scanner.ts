// src/modules/code-scanner.ts
import { glob } from 'glob';
import * as path from 'path';

/**
 * Scans the codebase to find features and files analogous to a given query.
 */
export class CodeScanner {
  /**
   * Finds files that are likely related to a feature description.
   * @param query A description of the feature (e.g., "listing creation wizard").
   * @returns A list of relevant file paths.
   */
  public async findAnalogousFiles(query: string): Promise<string[]> {
    console.log(`Scanning for files related to: "${query}"`);

    // Simple keyword extraction from the query
    const keywords = query.split(' ').filter(k => k.length > 3 && !['multi-step', 'creation', 'service'].includes(k));
    if (keywords.length === 0) return [];

    const searchPattern = `**/*{${keywords.join(',')}}*.tsx`;
    const projectRoot = path.join(__dirname, '../../../../..'); // Navigate up to the project root

    const files = await glob(searchPattern, { 
      cwd: projectRoot,
      ignore: ['node_modules/**', 'cas/**', 'dist/**'],
      absolute: true,
    });

    console.log(`Found ${files.length} potentially related files.`);
    return files;
  }
}
