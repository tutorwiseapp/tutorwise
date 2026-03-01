// src/modules/pattern-extractor.ts
import * as fs from 'fs';
import { getDesignSystemPath } from '../../../../packages/core/src/config/project-paths';
import { casGenerate } from '../../../../packages/core/src/services/cas-ai';

/**
 * Extracts proven design and architectural patterns from a given file.
 * Uses LLM for intelligent pattern extraction with regex fallback.
 */
export class PatternExtractor {
  /**
   * Extracts key patterns from a file.
   * Uses LLM to identify component structure, state management, API patterns, styling.
   * Falls back to regex patterns if LLM unavailable.
   */
  public extractPatterns(filePath: string): Record<string, string> {
    console.log(`Extracting patterns from: "${filePath}"`);
    const patterns: Record<string, string> = {};

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Use regex-based extraction (fast, deterministic, always available)
      this.extractRegexPatterns(content, patterns);

    } catch (error: any) {
      console.error(`Error reading or parsing file ${filePath}:`, error.message);
    }

    return patterns;
  }

  /**
   * Extracts patterns using LLM for intelligent analysis.
   * Call this when you need deeper pattern analysis beyond regex.
   */
  public async extractPatternsWithAI(filePath: string): Promise<Record<string, string>> {
    const patterns = this.extractPatterns(filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      const llmAnalysis = await casGenerate({
        systemPrompt: `You are a code analysis expert. Extract architectural and design patterns from source code.
Focus on: component structure, state management approach, API integration patterns, styling conventions, error handling patterns.
Return each pattern as a key-value pair on its own line in format "Pattern Name: description".`,
        userPrompt: `Analyze this file and extract the key architectural and design patterns used:

File: ${filePath}

Code (first 3000 chars):
${content.substring(0, 3000)}

List the patterns found (one per line, format "Pattern Name: description"):`,
        maxOutputTokens: 800,
      });

      if (llmAnalysis) {
        // Parse LLM output into key-value pairs
        const lines = llmAnalysis.split('\n').filter(l => l.includes(':'));
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).replace(/^[-*•\s]+/, '').trim();
            const value = line.substring(colonIndex + 1).trim();
            if (key && value && key.length < 50) {
              patterns[key] = value;
            }
          }
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ AI pattern extraction failed: ${error.message}`);
    }

    return patterns;
  }

  private extractRegexPatterns(content: string, patterns: Record<string, string>): void {
    // Layout System (CSS module import)
    if (content.match(/import\s+\w+\s+from\s+['"]\.\/page\.module\.css['"]/)) {
      patterns['Layout System'] = 'CSS Module wrapper (`styles.pageWrapper`)';
    }

    // Primary Color
    if (content.match(/bg-teal-600|border-teal-600|text-teal-600/)) {
      patterns['Primary Color'] = 'teal-600';
    }

    // Typography
    if (content.match(/className="text-4xl\s+font-bold/)) {
      patterns['Typography'] = 'h1 is text-4xl font-bold';
    }

    // Spacing
    if (content.match(/space-y-8|mb-12/)) {
      patterns['Spacing'] = '8px-based scale (e.g., space-y-8, mb-12)';
    }

    // Component patterns
    if (content.match(/export\s+default\s+function\s+\w+/)) {
      patterns['Component Style'] = 'Default function export';
    }
    if (content.match(/'use client'/)) {
      patterns['Rendering'] = 'Client component (use client directive)';
    }
    if (content.match(/'use server'/) || content.match(/async\s+function[\s\S]*?\{[\s\S]*?await/)) {
      patterns['Rendering'] = patterns['Rendering']
        ? 'Mixed (client + server)'
        : 'Server component / Server actions';
    }

    // State management
    if (content.match(/useState|useReducer/)) {
      patterns['State Management'] = 'React hooks (useState/useReducer)';
    }
    if (content.match(/useFormState|useActionState/)) {
      patterns['Form Handling'] = 'Server action forms';
    }

    // API patterns
    if (content.match(/createClient|supabase/i)) {
      patterns['Data Access'] = 'Direct Supabase client';
    }
    if (content.match(/fetch\s*\(|axios/)) {
      patterns['API Pattern'] = 'REST API calls';
    }
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
