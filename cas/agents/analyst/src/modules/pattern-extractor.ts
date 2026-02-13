// src/modules/pattern-extractor.ts
import * as fs from 'fs';
import ProjectPaths, { getDesignSystemPath } from '../../../../packages/core/src/config/project-paths';

/**
 * Extracts proven design and architectural patterns from a given file.
 * References the design system from .ai/6-DESIGN-SYSTEM.md for TutorWise patterns.
 */
export class PatternExtractor {
  /**
   * Extracts key patterns from a file.
   * @param filePath The path to the file to analyze.
   * @returns A structured object of discovered patterns.
   */
  public extractPatterns(filePath: string): Record<string, string> {
    console.log(`Extracting patterns from: "${filePath}"`);
    const patterns: Record<string, string> = {};

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Layout System (looks for CSS module import)
      const cssModuleMatch = content.match(/import\s+\w+\s+from\s+['"]\.\/page\.module\.css['"]/);
      if (cssModuleMatch) {
        patterns['Layout System'] = 'CSS Module wrapper (`styles.pageWrapper`)';
      }

      // Primary Color (looks for teal-600)
      const colorMatch = content.match(/bg-teal-600|border-teal-600|text-teal-600/);
      if (colorMatch) {
        patterns['Primary Color'] = 'teal-600';
      }

      // Typography (looks for common h1 class)
      const h1Match = content.match(/className="text-4xl\s+font-bold/);
      if (h1Match) {
        patterns['Typography'] = 'h1 is text-4xl font-bold';
      }

      // Spacing (looks for common spacing classes)
      const spacingMatch = content.match(/space-y-8|mb-12/);
      if (spacingMatch) {
        patterns['Spacing'] = '8px-based scale (e.g., space-y-8, mb-12)';
      }

    } catch (error: any) {
      console.error(`Error reading or parsing file ${filePath}:`, error.message);
    }

    return patterns;
  }

  /**
   * Loads design system guidelines from .ai/6-DESIGN-SYSTEM.md
   */
  public async loadDesignSystem(): Promise<string | null> {
    try {
      const designSystemPath = getDesignSystemPath();
      const content = fs.readFileSync(designSystemPath, 'utf8');
      console.log(`Loaded design system from: ${designSystemPath}`);
      return content;
    } catch (error: any) {
      console.warn(`Could not load design system: ${error.message}`);
      return null;
    }
  }

  /**
   * Gets the path to the design system documentation
   */
  public getDesignSystemPath(): string {
    return getDesignSystemPath();
  }
}
