/**
 * Simple Figma Sync for Claude Code Context Engineering
 * Fetches Figma designs and converts them to context for AI development
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';

interface FigmaConfig {
  accessToken: string;
  fileKeys: string[];
  includeImages?: boolean;
  imageFormat?: 'png' | 'jpg' | 'svg';
  imageScale?: number;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  backgroundColor?: string;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  exportSettings?: any[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: FigmaNode[];
}

interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  description: string;
  styles: {
    fill?: string;
    stroke?: string;
    text?: any;
    effect?: any;
  };
  dimensions: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  exportUrl?: string;
}

interface FigmaFile {
  key: string;
  name: string;
  thumbnail: string;
  lastModified: string;
  version: string;
  components: FigmaComponent[];
  styles: {
    colors: { [key: string]: string };
    typography: { [key: string]: any };
    effects: { [key: string]: any };
  };
  pages: {
    id: string;
    name: string;
    components: FigmaComponent[];
  }[];
}

class SimpleFigmaSync {
  private config: FigmaConfig;

  constructor(config: FigmaConfig) {
    this.config = config;
  }

  async syncDesigns(): Promise<void> {
    try {
      console.log('🔄 Syncing Figma designs to Claude Code context...');

      // Create directories
      await mkdir('.ai/figma', { recursive: true });
      await mkdir('.ai/figma/files', { recursive: true });
      await mkdir('.ai/figma/components', { recursive: true });
      await mkdir('.ai/figma/styles', { recursive: true });
      if (this.config.includeImages) {
        await mkdir('.ai/figma/images', { recursive: true });
      }

      let allFiles: FigmaFile[] = [];

      // Sync each Figma file
      for (const fileKey of this.config.fileKeys) {
        console.log(`📐 Syncing Figma file: ${fileKey}`);
        const figmaFile = await this.getFigmaFile(fileKey);
        if (figmaFile) {
          allFiles.push(figmaFile);
        }
      }

      console.log(`🎨 Processing ${allFiles.length} Figma files...`);

      // Create individual file documentation
      for (const file of allFiles) {
        const fileMd = this.formatFileAsMarkdown(file);
        const filename = this.sanitizeFilename(`${file.name}.md`);
        await writeFile(`.ai/figma/files/${filename}`, fileMd);

        // Create component files
        for (const component of file.components) {
          const componentMd = this.formatComponentAsMarkdown(component, file);
          const compFilename = this.sanitizeFilename(`${file.name}-${component.name}.md`);
          await writeFile(`.ai/figma/components/${compFilename}`, componentMd);
        }

        // Create style guide
        const stylesMd = this.formatStylesAsMarkdown(file);
        await writeFile(`.ai/figma/styles/${this.sanitizeFilename(file.name)}-styles.md`, stylesMd);
      }

      // Create overview
      const overview = this.createOverview(allFiles);
      await writeFile('.ai/figma/overview.md', overview);

      // Create design tokens
      const tokens = this.createDesignTokens(allFiles);
      await writeFile('.ai/figma/design-tokens.md', tokens);

      // Update main context
      await this.updateMainContext(allFiles);

      console.log('✅ Figma sync completed successfully!');
      console.log(`📁 Files created:`);
      console.log('   - .ai/figma/overview.md');
      console.log('   - .ai/figma/design-tokens.md');
      console.log(`   - .ai/figma/files/ (${allFiles.length} files)`);
      console.log(`   - .ai/figma/components/ (${allFiles.reduce((sum, f) => sum + f.components.length, 0)} files)`);
      console.log('   - Updated .ai/PROMPT.md');

    } catch (error) {
      console.error('❌ Error syncing Figma:', error);
      throw error;
    }
  }

  private async getFigmaFile(fileKey: string): Promise<FigmaFile | null> {
    try {
      // Get file metadata
      const fileResponse = await this.makeFigmaRequest(`/v1/files/${fileKey}`);

      // Get file nodes for detailed information
      const nodesResponse = await this.makeFigmaRequest(`/v1/files/${fileKey}/nodes`);

      const file: FigmaFile = {
        key: fileKey,
        name: fileResponse.name,
        thumbnail: fileResponse.thumbnailUrl || '',
        lastModified: fileResponse.lastModified,
        version: fileResponse.version,
        components: [],
        styles: {
          colors: {},
          typography: {},
          effects: {}
        },
        pages: []
      };

      // Process document structure
      if (fileResponse.document && fileResponse.document.children) {
        for (const page of fileResponse.document.children) {
          const pageComponents = this.extractComponentsFromNode(page);
          file.pages.push({
            id: page.id,
            name: page.name,
            components: pageComponents
          });
          file.components.push(...pageComponents);
        }
      }

      // Extract styles
      file.styles = this.extractStyles(fileResponse);

      // Get component images if requested
      if (this.config.includeImages && file.components.length > 0) {
        await this.fetchComponentImages(file);
      }

      return file;

    } catch (error) {
      console.warn(`⚠️  Could not fetch Figma file ${fileKey}: ${error}`);
      return null;
    }
  }

  private extractComponentsFromNode(node: FigmaNode, parentPath: string = ''): FigmaComponent[] {
    const components: FigmaComponent[] = [];
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    // Check if this node is a component or frame worth documenting
    if (this.isDocumentableNode(node)) {
      const component: FigmaComponent = {
        id: node.id,
        name: node.name,
        type: node.type,
        description: currentPath,
        styles: this.extractNodeStyles(node),
        dimensions: {
          width: node.absoluteBoundingBox?.width || 0,
          height: node.absoluteBoundingBox?.height || 0,
          x: node.absoluteBoundingBox?.x || 0,
          y: node.absoluteBoundingBox?.y || 0
        }
      };
      components.push(component);
    }

    // Recursively process children
    if (node.children) {
      for (const child of node.children) {
        components.push(...this.extractComponentsFromNode(child, currentPath));
      }
    }

    return components;
  }

  private isDocumentableNode(node: FigmaNode): boolean {
    // Document components, frames, and other significant UI elements
    return node.type === 'COMPONENT' ||
           node.type === 'FRAME' ||
           node.type === 'INSTANCE' ||
           (node.type === 'GROUP' && node.children && node.children.length > 2);
  }

  private extractNodeStyles(node: FigmaNode): any {
    const styles: any = {};

    // Extract background color
    if (node.backgroundColor) {
      styles.backgroundColor = this.rgbaToHex(node.backgroundColor);
    }

    // Extract fills
    if (node.fills && node.fills.length > 0) {
      styles.fill = node.fills.map(fill => this.processFill(fill));
    }

    // Extract strokes
    if (node.strokes && node.strokes.length > 0) {
      styles.stroke = node.strokes.map(stroke => this.processFill(stroke));
    }

    // Extract effects
    if (node.effects && node.effects.length > 0) {
      styles.effects = node.effects.map(effect => this.processEffect(effect));
    }

    return styles;
  }

  private extractStyles(fileData: any): any {
    const styles = {
      colors: {},
      typography: {},
      effects: {}
    };

    // Extract color styles
    if (fileData.styles) {
      Object.values(fileData.styles).forEach((style: any) => {
        if (style.styleType === 'FILL') {
          styles.colors[style.name] = style.description || 'Color style';
        } else if (style.styleType === 'TEXT') {
          styles.typography[style.name] = style.description || 'Text style';
        } else if (style.styleType === 'EFFECT') {
          styles.effects[style.name] = style.description || 'Effect style';
        }
      });
    }

    return styles;
  }

  private async fetchComponentImages(file: FigmaFile): Promise<void> {
    if (file.components.length === 0) return;

    try {
      const componentIds = file.components.slice(0, 10).map(c => c.id); // Limit to 10 components
      const imagesResponse = await this.makeFigmaRequest(
        `/v1/images/${file.key}?ids=${componentIds.join(',')}&format=${this.config.imageFormat || 'png'}&scale=${this.config.imageScale || 1}`
      );

      if (imagesResponse.images) {
        for (const [componentId, imageUrl] of Object.entries(imagesResponse.images)) {
          const component = file.components.find(c => c.id === componentId);
          if (component && imageUrl) {
            component.exportUrl = imageUrl as string;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch component images:', error);
    }
  }

  private processFill(fill: any): string {
    if (fill.type === 'SOLID') {
      return this.rgbaToHex(fill.color);
    }
    return fill.type || 'unknown';
  }

  private processEffect(effect: any): string {
    return `${effect.type}: ${effect.radius || 0}px`;
  }

  private rgbaToHex(color: any): string {
    if (!color) return '#000000';

    const r = Math.round((color.r || 0) * 255);
    const g = Math.round((color.g || 0) * 255);
    const b = Math.round((color.b || 0) * 255);
    const a = color.a !== undefined ? color.a : 1;

    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }

  private formatFileAsMarkdown(file: FigmaFile): string {
    return `# ${file.name}

**File Key**: ${file.key}
**Last Modified**: ${new Date(file.lastModified).toLocaleDateString()}
**Version**: ${file.version}
**Components**: ${file.components.length}
**Pages**: ${file.pages.length}

## Pages Overview
${file.pages.map(page =>
  `- **${page.name}**: ${page.components.length} components`
).join('\n')}

## Component Summary
${file.components.slice(0, 10).map(comp =>
  `- **${comp.name}** (${comp.type}) - ${comp.dimensions.width}×${comp.dimensions.height}`
).join('\n')}
${file.components.length > 10 ? `\n... and ${file.components.length - 10} more components` : ''}

## Design System
- **Colors**: ${Object.keys(file.styles.colors).length} styles
- **Typography**: ${Object.keys(file.styles.typography).length} styles
- **Effects**: ${Object.keys(file.styles.effects).length} styles

## Links
- [View in Figma](https://www.figma.com/file/${file.key}/)
${file.thumbnail ? `- [Thumbnail](${file.thumbnail})` : ''}

---
*Auto-generated from Figma on ${new Date().toISOString()}*
`;
  }

  private formatComponentAsMarkdown(component: FigmaComponent, file: FigmaFile): string {
    return `# ${component.name}

**Type**: ${component.type}
**File**: ${file.name}
**Dimensions**: ${component.dimensions.width} × ${component.dimensions.height}
**Position**: (${component.dimensions.x}, ${component.dimensions.y})

## Component Details
- **ID**: ${component.id}
- **Description**: ${component.description}

## Styles
${Object.entries(component.styles).map(([key, value]) =>
  `- **${key}**: ${Array.isArray(value) ? value.join(', ') : value}`
).join('\n')}

${component.exportUrl ? `## Preview
![${component.name}](${component.exportUrl})
` : ''}

## Development Context
This component can be implemented in React/Next.js following these specifications:

\`\`\`tsx
// ${component.name} Component
// Dimensions: ${component.dimensions.width}×${component.dimensions.height}
// Type: ${component.type}
\`\`\`

## Links
- [View in Figma](https://www.figma.com/file/${file.key}/?node-id=${component.id})

---
*Auto-generated from Figma on ${new Date().toISOString()}*
`;
  }

  private formatStylesAsMarkdown(file: FigmaFile): string {
    return `# ${file.name} - Design Styles

## Color Palette
${Object.entries(file.styles.colors).map(([name, desc]) =>
  `- **${name}**: ${desc}`
).join('\n') || 'No color styles defined'}

## Typography
${Object.entries(file.styles.typography).map(([name, desc]) =>
  `- **${name}**: ${desc}`
).join('\n') || 'No typography styles defined'}

## Effects
${Object.entries(file.styles.effects).map(([name, desc]) =>
  `- **${name}**: ${desc}`
).join('\n') || 'No effect styles defined'}

## CSS Variables (Generated)
\`\`\`css
:root {
${Object.keys(file.styles.colors).map((name, i) =>
  `  --color-${name.toLowerCase().replace(/\s+/g, '-')}: var(--figma-color-${i});`
).join('\n')}
}
\`\`\`

---
*Design system extracted from Figma on ${new Date().toISOString()}*
`;
  }

  private createOverview(files: FigmaFile[]): string {
    const totalComponents = files.reduce((sum, f) => sum + f.components.length, 0);
    const recentFiles = files
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 5);

    return `# Figma Design Overview

**Total Files**: ${files.length}
**Total Components**: ${totalComponents}
**Last Synced**: ${new Date().toISOString()}

## Files
${files.map(file =>
  `- **[${file.name}](./files/${this.sanitizeFilename(file.name)}.md)**: ${file.components.length} components`
).join('\n')}

## Recent Updates
${recentFiles.map(file =>
  `- **${file.name}** - Modified: ${new Date(file.lastModified).toLocaleDateString()} (v${file.version})`
).join('\n')}

## Component Index
${files.map(file =>
  file.components.slice(0, 3).map(comp =>
    `- **[${comp.name}](./components/${this.sanitizeFilename(`${file.name}-${comp.name}`)}.md)** (${file.name})`
  ).join('\n')
).join('\n')}

## Design System Links
${files.map(file =>
  `- **[${file.name} Styles](./styles/${this.sanitizeFilename(file.name)}-styles.md)**`
).join('\n')}

---
*This overview is automatically updated when you run Figma sync.*
`;
  }

  private createDesignTokens(files: FigmaFile[]): string {
    const allColors = new Set<string>();
    const allComponents = [];

    for (const file of files) {
      Object.keys(file.styles.colors).forEach(color => allColors.add(color));
      allComponents.push(...file.components);
    }

    return `# Design Tokens

Generated design tokens for consistent implementation across Tutorwise.

## Colors
${Array.from(allColors).map(color =>
  `- **${color}**: Use for consistent color application`
).join('\n')}

## Component Specifications
${allComponents.slice(0, 10).map(comp =>
  `### ${comp.name}
- **Size**: ${comp.dimensions.width}×${comp.dimensions.height}
- **Type**: ${comp.type}
- **Styles**: ${Object.keys(comp.styles).join(', ')}`
).join('\n\n')}

## Implementation Guidelines
1. **Use exact dimensions** from Figma specifications
2. **Follow color palette** as defined in design files
3. **Maintain component hierarchy** from design structure
4. **Responsive considerations** - adapt breakpoints as needed

## CSS Custom Properties
\`\`\`css
/* Generated from Figma designs */
:root {
  /* Add extracted color values here */
  --figma-primary: #your-primary-color;
  --figma-secondary: #your-secondary-color;
}
\`\`\`

---
*Design tokens updated on ${new Date().toISOString()}*
`;
  }

  private async updateMainContext(files: FigmaFile[]): Promise<void> {
    const totalComponents = files.reduce((sum, f) => sum + f.components.length, 0);
    const recentFiles = files
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 3);

    const contextSection = `

## Figma Design Context (Auto-generated)

**Total Design Files**: ${files.length}
**Total Components**: ${totalComponents}
**Last Synced**: ${new Date().toLocaleDateString()}

**Design Files**:
${files.map(file =>
  `- **${file.name}**: ${file.components.length} components (v${file.version})`
).join('\n')}

**Recent Updates**:
${recentFiles.map(file =>
  `- **${file.name}** - ${new Date(file.lastModified).toLocaleDateString()}`
).join('\n')}

> This context is automatically updated when you run Figma sync.
> Design specifications available in \`.ai/figma/\`
> Use design tokens for consistent UI implementation.

---
`;

    try {
      let promptContent = await readFile('.ai/PROMPT.md', 'utf8');

      // Remove existing Figma context section
      const contextRegex = /## Figma Design Context \(Auto-generated\)[\s\S]*?---\n/;
      promptContent = promptContent.replace(contextRegex, '');

      // Add new context section
      promptContent += contextSection;

      await writeFile('.ai/PROMPT.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/PROMPT.md - file may not exist');
    }
  }

  private async makeFigmaRequest(endpoint: string): Promise<any> {
    const url = `https://api.figma.com${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': this.config.accessToken,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/\.md$/, '');
  }
}

export { SimpleFigmaSync };