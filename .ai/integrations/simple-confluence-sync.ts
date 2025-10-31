/**
 * Simple Confluence Sync for Claude Code Context Engineering
 * Fetches Confluence pages and converts them to markdown for AI context
 */

import { writeFile, mkdir, readFile } from 'fs/promises';

interface ConfluenceConfig {
  baseUrl: string; // https://your-domain.atlassian.net
  email: string;
  apiToken: string;
  spaceKeys: string[]; // Confluence space keys to sync
  pageIds?: string[]; // Specific page IDs to sync
}

interface ConfluencePage {
  id: string;
  title: string;
  type: string;
  status: string;
  spaceKey: string;
  spaceName: string;
  version: number;
  createdDate: string;
  lastModified: string;
  webUrl: string;
  content: string;
  author: string;
  labels: string[];
}

class SimpleConfluenceSync {
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
  }

  async syncPages(): Promise<void> {
    try {
      console.log('🔄 Syncing Confluence pages to Claude Code context...');

      // Create directories
      await mkdir('.ai/confluence', { recursive: true });
      await mkdir('.ai/confluence/pages', { recursive: true });
      await mkdir('.ai/confluence/spaces', { recursive: true });

      let allPages: ConfluencePage[] = [];

      // Sync pages from specified spaces
      for (const spaceKey of this.config.spaceKeys) {
        console.log(`📚 Syncing space: ${spaceKey}`);
        const spacePages = await this.getPagesFromSpace(spaceKey);
        allPages = allPages.concat(spacePages);

        // Create space-specific overview
        const spaceOverview = this.createSpaceOverview(spaceKey, spacePages);
        await writeFile(`.ai/confluence/spaces/${spaceKey.toLowerCase()}.md`, spaceOverview);
      }

      // Sync specific pages if provided
      if (this.config.pageIds && this.config.pageIds.length > 0) {
        for (const pageId of this.config.pageIds) {
          const page = await this.getPage(pageId);
          if (page) {
            allPages.push(page);
          }
        }
      }

      console.log(`📄 Processing ${allPages.length} Confluence pages...`);

      // Create individual page files
      for (const page of allPages) {
        const pageMd = this.formatPageAsMarkdown(page);
        const filename = this.sanitizeFilename(`${page.spaceKey}-${page.id}-${page.title}.md`);
        await writeFile(`.ai/confluence/pages/${filename}`, pageMd);
      }

      // Create main overview
      const overview = this.createMainOverview(allPages);
      await writeFile('.ai/confluence/overview.md', overview);

      // Update main context
      await this.updateMainContext(allPages);

      console.log('✅ Confluence sync completed successfully!');
      console.log(`📁 Files created:`);
      console.log('   - .ai/confluence/overview.md');
      console.log(`   - .ai/confluence/pages/ (${allPages.length} files)`);
      console.log(`   - .ai/confluence/spaces/ (${this.config.spaceKeys.length} files)`);
      console.log('   - Updated .ai/prompt.md');

    } catch (error) {
      console.error('❌ Error syncing Confluence:', error);
      throw error;
    }
  }

  private async getPagesFromSpace(spaceKey: string): Promise<ConfluencePage[]> {
    const pages: ConfluencePage[] = [];
    let start = 0;
    const limit = 50;

    while (true) {
      const response = await this.makeConfluenceRequest(
        `/rest/api/content?spaceKey=${spaceKey}&expand=space,version,body.storage&start=${start}&limit=${limit}`
      );

      if (!response.results || response.results.length === 0) {
        break;
      }

      for (const page of response.results) {
        if (page.type === 'page') {
          pages.push(await this.formatPage(page));
        }
      }

      if (response.results.length < limit) {
        break;
      }

      start += limit;
    }

    return pages;
  }

  private async getPage(pageId: string): Promise<ConfluencePage | null> {
    try {
      const response = await this.makeConfluenceRequest(
        `/rest/api/content/${pageId}?expand=space,version,body.storage`
      );

      return await this.formatPage(response);
    } catch (error) {
      console.warn(`⚠️  Could not fetch page ${pageId}: ${error}`);
      return null;
    }
  }

  private async formatPage(pageData: any): Promise<ConfluencePage> {
    // Get labels for the page
    let labels: string[] = [];
    try {
      const labelsResponse = await this.makeConfluenceRequest(`/rest/api/content/${pageData.id}/label`);
      labels = labelsResponse.results?.map((label: any) => label.name) || [];
    } catch (error) {
      // Labels are optional, continue without them
    }

    return {
      id: pageData.id,
      title: pageData.title,
      type: pageData.type,
      status: pageData.status,
      spaceKey: pageData.space.key,
      spaceName: pageData.space.name,
      version: pageData.version.number,
      createdDate: pageData.history?.createdDate || pageData.version.when,
      lastModified: pageData.version.when,
      webUrl: `${this.config.baseUrl.replace('/rest/api', '')}/spaces/${pageData.space.key}/pages/${pageData.id}`,
      content: this.convertStorageFormatToMarkdown(pageData.body.storage.value),
      author: pageData.version.by.displayName,
      labels
    };
  }

  private convertStorageFormatToMarkdown(storageFormat: string): string {
    // Basic conversion from Confluence storage format to markdown
    // This is a simplified converter - a full implementation would handle more cases
    let markdown = storageFormat;

    // Convert headers
    markdown = markdown.replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (match, level, text) => {
      const hashes = '#'.repeat(parseInt(level));
      return `${hashes} ${text}`;
    });

    // Convert paragraphs
    markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n');

    // Convert bold
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');

    // Convert italic
    markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');

    // Convert code
    markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');

    // Convert links
    markdown = markdown.replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)');

    // Convert lists
    markdown = markdown.replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
      return content.replace(/<li>(.*?)<\/li>/g, '- $1');
    });

    markdown = markdown.replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1`);
    });

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '');

    // Clean up extra whitespace
    markdown = markdown.replace(/\n\s*\n/g, '\n\n').trim();

    return markdown;
  }

  private formatPageAsMarkdown(page: ConfluencePage): string {
    return `# ${page.title}

**Space**: ${page.spaceName} (${page.spaceKey})
**Page ID**: ${page.id}
**Author**: ${page.author}
**Last Modified**: ${new Date(page.lastModified).toLocaleDateString()}
**Version**: ${page.version}
**Status**: ${page.status}

${page.labels.length > 0 ? `**Labels**: ${page.labels.join(', ')}\n` : ''}

## Content

${page.content}

## Links
- [View in Confluence](${page.webUrl})

---
*Auto-generated from Confluence on ${new Date().toISOString()}*
`;
  }

  private createSpaceOverview(spaceKey: string, pages: ConfluencePage[]): string {
    const recentPages = pages
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 10);

    return `# ${spaceKey} Space Overview

**Space**: ${pages[0]?.spaceName || spaceKey}
**Total Pages**: ${pages.length}
**Last Synced**: ${new Date().toISOString()}

## Recent Pages (Last 10)
${recentPages.map(page =>
  `- **[${page.title}](../pages/${this.sanitizeFilename(`${page.spaceKey}-${page.id}-${page.title}`)}.md)** - Modified: ${new Date(page.lastModified).toLocaleDateString()} (v${page.version})`
).join('\n')}

## All Pages
${pages.map(page =>
  `- **[${page.title}](../pages/${this.sanitizeFilename(`${page.spaceKey}-${page.id}-${page.title}`)}.md)** - ${new Date(page.lastModified).toLocaleDateString()} (v${page.version})`
).join('\n')}

---
*This overview is automatically updated when you run Confluence sync.*
`;
  }

  private createMainOverview(pages: ConfluencePage[]): string {
    const spaceGroups = pages.reduce((groups, page) => {
      if (!groups[page.spaceKey]) {
        groups[page.spaceKey] = [];
      }
      groups[page.spaceKey].push(page);
      return groups;
    }, {} as Record<string, ConfluencePage[]>);

    const recentPages = pages
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 15);

    return `# Confluence Overview

**Total Pages**: ${pages.length}
**Spaces**: ${Object.keys(spaceGroups).length}
**Last Synced**: ${new Date().toISOString()}

## Spaces
${Object.entries(spaceGroups).map(([spaceKey, spacePages]) =>
  `- **[${spaceKey}](./spaces/${spaceKey.toLowerCase()}.md)**: ${spacePages[0]?.spaceName || spaceKey} (${spacePages.length} pages)`
).join('\n')}

## Recent Updates (Last 15)
${recentPages.map(page =>
  `- **[${page.title}](./pages/${this.sanitizeFilename(`${page.spaceKey}-${page.id}-${page.title}`)}.md)** (${page.spaceKey}) - ${new Date(page.lastModified).toLocaleDateString()}`
).join('\n')}

## Search Index
${pages.map(page =>
  `- **[${page.title}](./pages/${this.sanitizeFilename(`${page.spaceKey}-${page.id}-${page.title}`)}.md)** - ${page.spaceKey} - ${page.labels.join(', ')}`
).join('\n')}

---
*This overview is automatically updated when you run Confluence sync.*
`;
  }

  private async updateMainContext(pages: ConfluencePage[]): Promise<void> {
    const recentPages = pages
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 5);

    const spaceGroups = pages.reduce((groups, page) => {
      if (!groups[page.spaceKey]) {
        groups[page.spaceKey] = [];
      }
      groups[page.spaceKey].push(page);
      return groups;
    }, {} as Record<string, ConfluencePage[]>);

    const contextSection = `

## Confluence Context (Auto-generated)

**Total Pages**: ${pages.length}
**Spaces**: ${Object.keys(spaceGroups).length}
**Last Synced**: ${new Date().toLocaleDateString()}

**Spaces**:
${Object.entries(spaceGroups).map(([spaceKey, spacePages]) =>
  `- **${spaceKey}**: ${spacePages[0]?.spaceName} (${spacePages.length} pages)`
).join('\n')}

**Recent Updates**:
${recentPages.map(page =>
  `- **${page.title}** (${page.spaceKey}) - ${new Date(page.lastModified).toLocaleDateString()}`
).join('\n')}

> This context is automatically updated when you run Confluence sync.
> Full documentation available in \`.ai/confluence/pages/\`

---
`;

    try {
      let promptContent = await readFile('.ai/prompt.md', 'utf8');

      // Remove existing Confluence context section
      const contextRegex = /## Confluence Context \(Auto-generated\)[\s\S]*?---\n/;
      promptContent = promptContent.replace(contextRegex, '');

      // Add new context section before the end
      promptContent += contextSection;

      await writeFile('.ai/prompt.md', promptContent);
    } catch (error) {
      console.log('Note: Could not update .ai/prompt.md - file may not exist');
    }
  }

  private async makeConfluenceRequest(endpoint: string) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.status} ${response.statusText}`);
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

export { SimpleConfluenceSync };