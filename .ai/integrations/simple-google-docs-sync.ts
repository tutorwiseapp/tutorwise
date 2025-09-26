/**
 * Simple Google Docs Sync for Claude Code Context Engineering
 * Fetches Google Docs and converts them to markdown for AI context
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';

interface GoogleDocsConfig {
  credentials: string; // Path to service account JSON
  folderIds: string[]; // Google Drive folder IDs to sync
  documentIds?: string[]; // Specific document IDs to sync
}

interface GoogleDoc {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  content: string;
  exportFormat: 'markdown' | 'text' | 'html';
}

class SimpleGoogleDocsSync {
  private config: GoogleDocsConfig;
  private accessToken: string = '';

  constructor(config: GoogleDocsConfig) {
    this.config = config;
  }

  async syncDocuments(): Promise<void> {
    try {
      console.log('🔄 Syncing Google Docs to Claude Code context...');

      // Authenticate with Google APIs
      await this.authenticate();

      // Create directories
      await mkdir('.ai/google-docs', { recursive: true });
      await mkdir('.ai/google-docs/documents', { recursive: true });

      let allDocs: GoogleDoc[] = [];

      // Sync documents from specified folders
      for (const folderId of this.config.folderIds) {
        const folderDocs = await this.getDocumentsFromFolder(folderId);
        allDocs = allDocs.concat(folderDocs);
        console.log(`📁 Found ${folderDocs.length} documents in folder ${folderId}`);
      }

      // Sync specific documents if provided
      if (this.config.documentIds && this.config.documentIds.length > 0) {
        for (const docId of this.config.documentIds) {
          const doc = await this.getDocument(docId);
          if (doc) {
            allDocs.push(doc);
          }
        }
      }

      console.log(`📄 Processing ${allDocs.length} Google Docs...`);

      // Create document files
      for (const doc of allDocs) {
        const docMd = this.formatDocumentAsMarkdown(doc);
        const filename = this.sanitizeFilename(`${doc.name}.md`);
        await writeFile(`.ai/google-docs/documents/${filename}`, docMd);
      }

      // Create overview file
      const overview = this.createOverview(allDocs);
      await writeFile('.ai/google-docs/overview.md', overview);

      // Update main context
      await this.updateMainContext(allDocs);

      console.log('✅ Google Docs sync completed successfully!');
      console.log(`📁 Files created:`);
      console.log('   - .ai/google-docs/overview.md');
      console.log(`   - .ai/google-docs/documents/ (${allDocs.length} files)`);
      console.log('   - Updated .ai/PROMPT.md');

    } catch (error) {
      console.error('❌ Error syncing Google Docs:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    try {
      // Load service account credentials
      const credentials = JSON.parse(await readFile(this.config.credentials, 'utf8'));

      // Create JWT for Google APIs
      const jwt = await this.createJWT(credentials);

      // Exchange JWT for access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      console.log('✅ Authenticated with Google APIs');

    } catch (error) {
      console.error('❌ Google authentication failed:', error);
      throw new Error('Failed to authenticate with Google APIs. Check your service account credentials.');
    }
  }

  private async createJWT(credentials: any): Promise<string> {
    const jwt = require('jsonwebtoken');

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Sign the JWT with the private key from service account
    return jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });
  }

  private async getDocumentsFromFolder(folderId: string): Promise<GoogleDoc[]> {
    const response = await this.makeGoogleAPIRequest(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+(mimeType='application/vnd.google-apps.document'+or+mimeType='text/plain')&fields=files(id,name,mimeType,modifiedTime,webViewLink)`
    );

    const documents: GoogleDoc[] = [];

    for (const file of response.files) {
      try {
        const content = await this.getDocumentContent(file.id, file.mimeType);
        documents.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          content,
          exportFormat: 'markdown'
        });
      } catch (error) {
        console.warn(`⚠️  Could not fetch content for document ${file.name}: ${error}`);
      }
    }

    return documents;
  }

  private async getDocument(documentId: string): Promise<GoogleDoc | null> {
    try {
      const fileResponse = await this.makeGoogleAPIRequest(
        `https://www.googleapis.com/drive/v3/files/${documentId}?fields=id,name,mimeType,modifiedTime,webViewLink`
      );

      const content = await this.getDocumentContent(documentId, fileResponse.mimeType);

      return {
        id: fileResponse.id,
        name: fileResponse.name,
        mimeType: fileResponse.mimeType,
        modifiedTime: fileResponse.modifiedTime,
        webViewLink: fileResponse.webViewLink,
        content,
        exportFormat: 'markdown'
      };
    } catch (error) {
      console.warn(`⚠️  Could not fetch document ${documentId}: ${error}`);
      return null;
    }
  }

  private async getDocumentContent(documentId: string, mimeType: string): Promise<string> {
    if (mimeType === 'application/vnd.google-apps.document') {
      // Google Docs - export as plain text (markdown export requires more complex parsing)
      const response = await this.makeGoogleAPIRequest(
        `https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=text/plain`
      );
      return typeof response === 'string' ? response : response.toString();
    } else {
      // Other text files
      const response = await this.makeGoogleAPIRequest(
        `https://www.googleapis.com/drive/v3/files/${documentId}?alt=media`
      );
      return typeof response === 'string' ? response : response.toString();
    }
  }

  private async makeGoogleAPIRequest(url: string) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      return response.text();
    }
  }

  private formatDocumentAsMarkdown(doc: GoogleDoc): string {
    return `# ${doc.name}

**Document ID**: ${doc.id}
**Last Modified**: ${new Date(doc.modifiedTime).toLocaleDateString()}
**Type**: ${doc.mimeType}

## Content

${doc.content}

## Links
- [View in Google Docs](${doc.webViewLink})
- [Direct Link](https://docs.google.com/document/d/${doc.id}/edit)

---
*Auto-generated from Google Docs on ${new Date().toISOString()}*
`;
  }

  private createOverview(docs: GoogleDoc[]): string {
    const recentDocs = docs
      .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
      .slice(0, 10);

    return `# Google Docs Overview

**Total Documents**: ${docs.length}
**Last Synced**: ${new Date().toISOString()}

## Recent Documents (Last 10)
${recentDocs.map(doc =>
  `- **[${doc.name}](./documents/${this.sanitizeFilename(doc.name)}.md)** - Modified: ${new Date(doc.modifiedTime).toLocaleDateString()}`
).join('\n')}

## All Documents
${docs.map(doc =>
  `- **[${doc.name}](./documents/${this.sanitizeFilename(doc.name)}.md)** (${doc.mimeType}) - ${new Date(doc.modifiedTime).toLocaleDateString()}`
).join('\n')}

---
*This overview is automatically updated when you run Google Docs sync.*
`;
  }

  private async updateMainContext(docs: GoogleDoc[]): Promise<void> {
    const recentDocs = docs
      .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
      .slice(0, 5);

    const contextSection = `

## Google Docs Context (Auto-generated)

**Total Documents**: ${docs.length}
**Last Synced**: ${new Date().toLocaleDateString()}

**Recent Documents**:
${recentDocs.map(doc =>
  `- **${doc.name}** - ${new Date(doc.modifiedTime).toLocaleDateString()}`
).join('\n')}

> This context is automatically updated when you run Google Docs sync.
> Full documents available in \`.ai/google-docs/documents/\`

---
`;

    try {
      let promptContent = await readFile('.ai/PROMPT.md', 'utf8');

      // Remove existing Google Docs context section
      const contextRegex = /## Google Docs Context \(Auto-generated\)[\s\S]*?---\n/;
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

export { SimpleGoogleDocsSync };