// src/modules/code-scanner.ts
import { glob } from 'glob';
import * as path from 'path';
import ProjectPaths, { getAllContextFiles } from '../../../../packages/core/src/config/project-paths';

/**
 * Scans the codebase to find features and files analogous to a given query.
 * Uses centralized project paths configuration from cas/packages/core/src/config/project-paths.ts
 */
export class CodeScanner {
  private projectRoot: string;

  constructor() {
    this.projectRoot = ProjectPaths.projectRoot;
  }

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

    const files = await glob(searchPattern, {
      cwd: this.projectRoot,
      ignore: ['node_modules/**', 'cas/**', 'dist/**'],
      absolute: true,
    });

    console.log(`Found ${files.length} potentially related files.`);
    return files;
  }

  /**
   * Gets all AI context files from the .ai/ folder
   */
  public getContextFiles(): string[] {
    return getAllContextFiles();
  }

  /**
   * Gets the project root path
   */
  public getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Gets the web app source directory
   */
  public getWebAppSrc(): string {
    return ProjectPaths.webApp.src;
  }
}
