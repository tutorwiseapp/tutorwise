import * as fs from 'fs';
import * as path from 'path';

/**
 * Strategic Reader Module
 * Reads and parses organizational strategic documents dynamically.
 * No more hardcoded arrays — extracts values, goals, and systems from actual docs.
 */
export class StrategicReader {
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../../../');
  }

  /**
   * Read organizational vision, mission, values, and strategic goals
   * Dynamically parses .ai/0-tutorwise.md instead of returning hardcoded arrays.
   */
  public readOrganizationalVision(): {
    vision: string;
    mission: string;
    coreValues: string[];
    strategicGoals: string[];
    strategicApproaches: string[];
  } {
    const filePath = path.join(this.projectRoot, '.ai/0-TUTORWISE.md');

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract vision
      const visionMatch = content.match(/## Vision\s*\n\s*\n([\s\S]*?)(?=\n\s*##)/);
      const vision = visionMatch ? visionMatch[1].trim() : '';

      // Extract mission
      const missionMatch = content.match(/## Mission\s*\n\s*\n([\s\S]*?)(?=\n\s*##)/);
      const mission = missionMatch ? missionMatch[1].trim() : '';

      // Dynamically extract core values (numbered list items after ## Core Values or similar)
      const coreValues = this.extractListItems(content, /##\s*(?:Core\s+)?Values/i);

      // Dynamically extract strategic goals
      const strategicGoals = this.extractListItems(content, /##\s*Strategic\s+Goals/i);

      // Dynamically extract strategic approaches
      const strategicApproaches = this.extractListItems(content, /##\s*Strategic\s+Approach/i);

      // Fallback to known values if parsing fails
      return {
        vision,
        mission,
        coreValues: coreValues.length > 0 ? coreValues : [
          'Focus on the User-centric Experience',
          'Build Thriving Communities',
          'Commit to Excellence',
          'Take Ownership',
          'Grow Through Learning',
          'Embrace Frugality',
          'Champion Innovation',
        ],
        strategicGoals: strategicGoals.length > 0 ? strategicGoals : [
          'Scalability',
          'Transparency',
          'Trust',
          'Sustainability',
          'Innovation',
        ],
        strategicApproaches: strategicApproaches.length > 0 ? strategicApproaches : [
          'Emulate', 'Exploit', 'Elevate',
        ],
      };
    } catch (error: any) {
      console.error(`❌ Failed to read organizational vision: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read strategic roadmap with current status and metrics.
   * Dynamically parses .ai/1-roadmap.md for all data.
   */
  public readStrategicRoadmap(): {
    projectStatus: string;
    completionPercentage: number;
    betaReleaseDate: string;
    keyMetrics: {
      pages: number;
      linesOfCode: string;
      migrations: number;
      components: number;
      features: number;
    };
    completedSystems: string[];
    inProgress: string[];
    criticalPath: string[];
  } {
    const filePath = path.join(this.projectRoot, '.ai/1-ROADMAP.md');

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract completion percentage
      const statusMatch = content.match(/(\d+)%\s*Complete/i);
      const completionPercentage = statusMatch ? parseInt(statusMatch[1]) : 0;

      // Extract beta release date
      const betaMatch = content.match(/Beta\s+Release[:\s]*(.*?)(?:\n|\*)/i);
      const betaReleaseDate = betaMatch ? betaMatch[1].trim() : '';

      // Extract key metrics
      const pagesMatch = content.match(/\*?\*?(\d+)\s+pages\*?\*?/i);
      const locMatch = content.match(/\*?\*?(\d+K?)\s+lines?\s+of\s+code\*?\*?/i);
      const migrationsMatch = content.match(/\*?\*?(\d+)\s+(?:database\s+)?migrations?\*?\*?/i);
      const componentsMatch = content.match(/\*?\*?(\d+)\s+components?\*?\*?/i);
      const featuresMatch = content.match(/\*?\*?(\d+)\s+(?:major\s+)?features?\*?\*?/i);

      const keyMetrics = {
        pages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
        linesOfCode: locMatch ? locMatch[1] : '0K',
        migrations: migrationsMatch ? parseInt(migrationsMatch[1]) : 0,
        components: componentsMatch ? parseInt(componentsMatch[1]) : 0,
        features: featuresMatch ? parseInt(featuresMatch[1]) : 0,
      };

      // Extract completed systems (from section with ✅ or "Completed")
      const completedSystems = this.extractChecklistItems(content, /##\s*(?:✅\s*)?Completed/i);

      // Extract in-progress items
      const inProgress = this.extractChecklistItems(content, /##\s*(?:🚧\s*)?In\s*Progress/i);

      // Extract critical path
      const criticalPath = this.extractChecklistItems(content, /##\s*(?:🎯\s*)?Critical\s*Path/i);

      return {
        projectStatus: `${completionPercentage}% Complete`,
        completionPercentage,
        betaReleaseDate,
        keyMetrics,
        completedSystems,
        inProgress,
        criticalPath,
      };
    } catch (error: any) {
      console.error(`❌ Failed to read strategic roadmap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract list items from a markdown section.
   * Finds the section header and extracts bullet/numbered items until the next section.
   */
  private extractListItems(content: string, sectionPattern: RegExp): string[] {
    const items: string[] = [];

    const sectionMatch = content.match(new RegExp(sectionPattern.source + '\\s*\\n([\\s\\S]*?)(?=\\n##|$)', 'i'));
    if (!sectionMatch) return items;

    const sectionContent = sectionMatch[1];
    // Match numbered items (1. Item) or bullet items (- Item, * Item)
    const listItemRegex = /(?:^|\n)\s*(?:\d+\.\s*|\-\s*|\*\s*)\*?\*?([^*\n]+)\*?\*?/g;
    let match;
    while ((match = listItemRegex.exec(sectionContent)) !== null) {
      const item = match[1].trim().replace(/\*+/g, '').trim();
      if (item && item.length > 2 && !item.startsWith('#')) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Extract checklist items (with ✅, -, or numbered) from a section.
   */
  private extractChecklistItems(content: string, sectionPattern: RegExp): string[] {
    const items: string[] = [];

    const sectionMatch = content.match(new RegExp(sectionPattern.source + '\\s*\\n([\\s\\S]*?)(?=\\n##|$)', 'i'));
    if (!sectionMatch) return items;

    const sectionContent = sectionMatch[1];
    const lines = sectionContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Match: - ✅ Item, - Item, * Item, 1. Item
      const itemMatch = trimmed.match(/^(?:\d+\.\s*|[\-\*]\s*)(?:✅\s*|🔄\s*|🎯\s*|🚧\s*)?(.+)$/);
      if (itemMatch) {
        const item = itemMatch[1].replace(/\*+/g, '').trim();
        if (item && item.length > 2) {
          items.push(item);
        }
      }
    }

    return items;
  }
}
