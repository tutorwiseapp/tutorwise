/**
 * Simple Mermaid Diagram Sync for Claude Code Context Engineering
 * Processes Mermaid diagrams and converts them to visual context for AI
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { readdir } from 'fs/promises';

interface MermaidConfig {
  diagramPaths: string[]; // Directories to scan for .mmd files
  includePatterns?: string[]; // File patterns to include
  excludePatterns?: string[]; // File patterns to exclude
  outputFormat: 'markdown' | 'html' | 'both';
}

interface MermaidDiagram {
  id: string;
  filename: string;
  path: string;
  title: string;
  type: string;
  content: string;
  description: string;
  modifiedTime: string;
  size: number;
}

class SimpleMermaidSync {
  private config: MermaidConfig;

  constructor(config: MermaidConfig) {
    this.config = config;
  }

  async syncDiagrams(): Promise<void> {
    try {
      console.log('🔄 Syncing Mermaid diagrams to Claude Code context...');

      // Create directories
      await mkdir('.ai/mermaid', { recursive: true });
      await mkdir('.ai/mermaid/diagrams', { recursive: true });
      await mkdir('.ai/mermaid/rendered', { recursive: true });

      let allDiagrams: MermaidDiagram[] = [];

      // Scan specified paths for Mermaid files
      for (const diagramPath of this.config.diagramPaths) {
        console.log(`📁 Scanning path: ${diagramPath}`);
        const pathDiagrams = await this.scanDirectory(diagramPath);
        allDiagrams = allDiagrams.concat(pathDiagrams);
      }

      console.log(`📊 Processing ${allDiagrams.length} Mermaid diagrams...`);

      // Create individual diagram files
      for (const diagram of allDiagrams) {
        const diagramMd = this.formatDiagramAsMarkdown(diagram);
        const filename = this.sanitizeFilename(`${diagram.filename}.md`);
        await writeFile(`.ai/mermaid/diagrams/${filename}`, diagramMd);

        // Create HTML version if requested
        if (this.config.outputFormat === 'html' || this.config.outputFormat === 'both') {
          const diagramHtml = this.formatDiagramAsHtml(diagram);
          await writeFile(`.ai/mermaid/rendered/${this.sanitizeFilename(diagram.filename)}.html`, diagramHtml);
        }
      }

      // Create overview file
      const overview = this.createOverview(allDiagrams);
      await writeFile('.ai/mermaid/overview.md', overview);

      // Create diagram index
      const diagramIndex = this.createDiagramIndex(allDiagrams);
      await writeFile('.ai/mermaid/diagram-index.md', diagramIndex);

      // Update main context
      await this.updateMainContext(allDiagrams);

      console.log('✅ Mermaid diagram sync completed successfully!');
      console.log(`📁 Files created:`);
      console.log('   - .ai/mermaid/overview.md');
      console.log('   - .ai/mermaid/diagram-index.md');
      console.log(`   - .ai/mermaid/diagrams/ (${allDiagrams.length} files)`);
      if (this.config.outputFormat === 'html' || this.config.outputFormat === 'both') {
        console.log(`   - .ai/mermaid/rendered/ (${allDiagrams.length} HTML files)`);
      }
      console.log('   - Updated .ai/PROMPT.md');

    } catch (error) {
      console.error('❌ Error syncing Mermaid diagrams:', error);
      throw error;
    }
  }

  private async scanDirectory(dirPath: string): Promise<MermaidDiagram[]> {
    const diagrams: MermaidDiagram[] = [];

    try {
      const items = await readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = join(dirPath, item.name);

        if (item.isDirectory()) {
          // Recursively scan subdirectories
          const subDiagrams = await this.scanDirectory(fullPath);
          diagrams.push(...subDiagrams);
        } else if (this.isMermaidFile(item.name)) {
          const diagram = await this.processDiagramFile(fullPath);
          if (diagram) {
            diagrams.push(diagram);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not scan directory ${dirPath}: ${error}`);
    }

    return diagrams;
  }

  private isMermaidFile(filename: string): boolean {
    const mermaidExtensions = ['.mmd', '.mermaid', '.md'];
    const hasValidExtension = mermaidExtensions.some(ext => filename.endsWith(ext));

    // Apply include patterns if specified
    if (this.config.includePatterns && this.config.includePatterns.length > 0) {
      const matchesInclude = this.config.includePatterns.some(pattern =>
        new RegExp(pattern).test(filename)
      );
      if (!matchesInclude) return false;
    }

    // Apply exclude patterns if specified
    if (this.config.excludePatterns && this.config.excludePatterns.length > 0) {
      const matchesExclude = this.config.excludePatterns.some(pattern =>
        new RegExp(pattern).test(filename)
      );
      if (matchesExclude) return false;
    }

    return hasValidExtension;
  }

  private async processDiagramFile(filePath: string): Promise<MermaidDiagram | null> {
    try {
      const content = await readFile(filePath, 'utf8');
      const stats = await require('fs/promises').stat(filePath);

      // Extract Mermaid content
      const mermaidContent = this.extractMermaidFromContent(content);
      if (!mermaidContent) {
        return null;
      }

      const filename = require('path').basename(filePath, require('path').extname(filePath));
      const diagramType = this.detectDiagramType(mermaidContent);
      const title = this.extractTitle(content, filename);
      const description = this.extractDescription(content);

      return {
        id: require('crypto').createHash('md5').update(filePath).digest('hex'),
        filename,
        path: filePath,
        title,
        type: diagramType,
        content: mermaidContent,
        description,
        modifiedTime: stats.mtime.toISOString(),
        size: stats.size
      };
    } catch (error) {
      console.warn(`⚠️  Could not process diagram file ${filePath}: ${error}`);
      return null;
    }
  }

  private extractMermaidFromContent(content: string): string {
    // Extract Mermaid from markdown code blocks
    const mermaidBlockMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
    if (mermaidBlockMatch) {
      return mermaidBlockMatch[1].trim();
    }

    // If it's a .mmd file, assume entire content is Mermaid
    return content.trim();
  }

  private detectDiagramType(mermaidContent: string): string {
    if (mermaidContent.includes('graph')) return 'Flowchart';
    if (mermaidContent.includes('sequenceDiagram')) return 'Sequence Diagram';
    if (mermaidContent.includes('classDiagram')) return 'Class Diagram';
    if (mermaidContent.includes('stateDiagram')) return 'State Diagram';
    if (mermaidContent.includes('erDiagram')) return 'Entity Relationship';
    if (mermaidContent.includes('journey')) return 'User Journey';
    if (mermaidContent.includes('gantt')) return 'Gantt Chart';
    if (mermaidContent.includes('pie')) return 'Pie Chart';
    if (mermaidContent.includes('gitgraph')) return 'Git Graph';
    return 'Unknown';
  }

  private extractTitle(content: string, fallback: string): string {
    // Try to extract title from markdown header
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Try to extract from Mermaid title
    const mermaidTitleMatch = content.match(/title\s+(.+)$/m);
    if (mermaidTitleMatch) {
      return mermaidTitleMatch[1].trim();
    }

    return fallback.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private extractDescription(content: string): string {
    // Look for description after title
    const lines = content.split('\n');
    let description = '';
    let foundTitle = false;

    for (const line of lines) {
      if (line.startsWith('#') && !foundTitle) {
        foundTitle = true;
        continue;
      }

      if (foundTitle && line.trim() && !line.startsWith('```')) {
        description = line.trim();
        break;
      }
    }

    return description || 'No description available';
  }

  private formatDiagramAsMarkdown(diagram: MermaidDiagram): string {
    return `# ${diagram.title}

**Type**: ${diagram.type}
**File**: ${diagram.filename}
**Path**: ${diagram.path}
**Last Modified**: ${new Date(diagram.modifiedTime).toLocaleDateString()}
**Size**: ${diagram.size} bytes

## Description
${diagram.description}

## Diagram Code
\`\`\`mermaid
${diagram.content}
\`\`\`

## Visual Representation
> To render this diagram, copy the code above and paste it into:
> - [Mermaid Live Editor](https://mermaid.live/)
> - GitHub/GitLab markdown files
> - VS Code with Mermaid extension

## Context for AI
This diagram represents: ${this.generateContextDescription(diagram)}

---
*Auto-generated from Mermaid diagram on ${new Date().toISOString()}*
`;
  }

  private formatDiagramAsHtml(diagram: MermaidDiagram): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${diagram.title}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .diagram { text-align: center; margin: 20px 0; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${diagram.title}</h1>
            <p><strong>Type:</strong> ${diagram.type}</p>
            <p>${diagram.description}</p>
        </div>

        <div class="diagram">
            <div class="mermaid">
${diagram.content}
            </div>
        </div>

        <div class="metadata">
            <h3>Diagram Information</h3>
            <ul>
                <li><strong>File:</strong> ${diagram.filename}</li>
                <li><strong>Path:</strong> ${diagram.path}</li>
                <li><strong>Last Modified:</strong> ${new Date(diagram.modifiedTime).toLocaleDateString()}</li>
                <li><strong>Size:</strong> ${diagram.size} bytes</li>
            </ul>
        </div>
    </div>

    <script>
        mermaid.initialize({ startOnLoad: true });
    </script>
</body>
</html>`;
  }

  private generateContextDescription(diagram: MermaidDiagram): string {
    const typeDescriptions: { [key: string]: string } = {
      'Flowchart': 'a process flow, decision tree, or system workflow',
      'Sequence Diagram': 'interactions between different entities over time',
      'Class Diagram': 'object-oriented system structure and relationships',
      'State Diagram': 'system states and transitions between them',
      'Entity Relationship': 'database schema and entity relationships',
      'User Journey': 'user experience and interaction flow',
      'Gantt Chart': 'project timeline and task dependencies',
      'Pie Chart': 'data distribution and proportions',
      'Git Graph': 'version control workflow and branching strategy'
    };

    return typeDescriptions[diagram.type] || 'system architecture or process visualization';
  }

  private createOverview(diagrams: MermaidDiagram[]): string {
    const typeGroups = diagrams.reduce((groups, diagram) => {
      if (!groups[diagram.type]) {
        groups[diagram.type] = [];
      }
      groups[diagram.type].push(diagram);
      return groups;
    }, {} as Record<string, MermaidDiagram[]>);

    const recentDiagrams = diagrams
      .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
      .slice(0, 10);

    return `# Mermaid Diagrams Overview

**Total Diagrams**: ${diagrams.length}
**Diagram Types**: ${Object.keys(typeGroups).length}
**Last Synced**: ${new Date().toISOString()}

## Diagram Types
${Object.entries(typeGroups).map(([type, typeDiagrams]) =>
  `- **${type}**: ${typeDiagrams.length} diagrams`
).join('\n')}

## Recent Diagrams (Last 10)
${recentDiagrams.map(diagram =>
  `- **[${diagram.title}](./diagrams/${this.sanitizeFilename(diagram.filename)}.md)** (${diagram.type}) - Modified: ${new Date(diagram.modifiedTime).toLocaleDateString()}`
).join('\n')}

## All Diagrams by Type
${Object.entries(typeGroups).map(([type, typeDiagrams]) =>
  `### ${type}\n${typeDiagrams.map(diagram =>
    `- **[${diagram.title}](./diagrams/${this.sanitizeFilename(diagram.filename)}.md)** - ${new Date(diagram.modifiedTime).toLocaleDateString()}`
  ).join('\n')}`
).join('\n\n')}

---
*This overview is automatically updated when you run Mermaid diagram sync.*
`;
  }

  private createDiagramIndex(diagrams: MermaidDiagram[]): string {
    return `# Mermaid Diagram Index

This index provides quick access to all Mermaid diagrams for AI context engineering.

## Quick Reference
${diagrams.map(diagram =>
  `- **[${diagram.title}](./diagrams/${this.sanitizeFilename(diagram.filename)}.md)** - ${diagram.type} - \`${diagram.filename}\``
).join('\n')}

## Context Mapping
${diagrams.map(diagram =>
  `### ${diagram.title}
- **Type**: ${diagram.type}
- **Context**: ${this.generateContextDescription(diagram)}
- **File**: \`${diagram.path}\`
- **Use Case**: Understanding ${diagram.type.toLowerCase()} patterns and relationships`
).join('\n\n')}

---
*Generated for Claude Code context engineering on ${new Date().toISOString()}*
`;
  }

  private async updateMainContext(diagrams: MermaidDiagram[]): Promise<void> {
    const typeGroups = diagrams.reduce((groups, diagram) => {
      if (!groups[diagram.type]) {
        groups[diagram.type] = [];
      }
      groups[diagram.type].push(diagram);
      return groups;
    }, {} as Record<string, MermaidDiagram[]>);

    const recentDiagrams = diagrams
      .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
      .slice(0, 3);

    const contextSection = `

## Mermaid Diagrams Context (Auto-generated)

**Total Diagrams**: ${diagrams.length}
**Diagram Types**: ${Object.keys(typeGroups).length}
**Last Synced**: ${new Date().toLocaleDateString()}

**Diagram Types**:
${Object.entries(typeGroups).map(([type, typeDiagrams]) =>
  `- **${type}**: ${typeDiagrams.length} diagrams`
).join('\n')}

**Recent Updates**:
${recentDiagrams.map(diagram =>
  `- **${diagram.title}** (${diagram.type}) - ${new Date(diagram.modifiedTime).toLocaleDateString()}`
).join('\n')}

> This context is automatically updated when you run Mermaid diagram sync.
> Visual diagrams available in \`.ai/mermaid/diagrams/\`
> Rendered HTML versions in \`.ai/mermaid/rendered/\`

---
`;

    try {
      let promptContent = await readFile('.ai/PROMPT.md', 'utf8');

      // Remove existing Mermaid context section
      const contextRegex = /## Mermaid Diagrams Context \(Auto-generated\)[\s\S]*?---\n/;
      promptContent = promptContent.replace(contextRegex, '');

      // Add new context section before the end
      promptContent += contextSection;

      await writeFile('.ai/PROMPT.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/PROMPT.md - file may not exist');
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/\.md$/, '');
  }
}

export { SimpleMermaidSync };