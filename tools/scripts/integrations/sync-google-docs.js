#!/usr/bin/env node

/**
 * Google Docs Documentation Sync
 * Syncs markdown files from docs/ folder to Google Docs
 * Also includes Google Calendar polling functionality
 */

const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

// Configuration from environment variables
const config = {
  serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json',
  docsPath: path.join(__dirname, '../../docs'),
  folderIds: process.env.GOOGLE_DOCS_FOLDER_IDS?.split(',') || [],
  calendarIds: process.env.GOOGLE_CALENDAR_IDS?.split(',') || ['primary'],
  pollInterval: 10 * 60 * 1000 // 10 minutes in milliseconds
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

class GoogleServicesSync {
  constructor() {
    this.auth = null;
    this.docs = null;
    this.drive = null;
    this.calendar = null;
    this.pollingActive = false;
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async initialize() {
    try {
      // Check if service account file exists
      await fs.access(config.serviceAccountPath);

      // Load service account credentials
      const credentials = JSON.parse(await fs.readFile(config.serviceAccountPath, 'utf8'));

      // Create JWT auth client
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/calendar.readonly'
        ]
      );

      await this.auth.authorize();

      // Initialize Google APIs
      this.docs = google.docs({ version: 'v1', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });

      this.log('✅ Google Services authentication successful', 'green');
      return true;

    } catch (error) {
      this.log(`❌ Google Services authentication failed: ${error.message}`, 'red');
      this.log(`Make sure ${config.serviceAccountPath} exists and is valid`, 'yellow');
      return false;
    }
  }

  async ensureFolder(folderName, parentId = null) {
    try {
      // Search for existing folder
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchQuery = parentId ? `${query} and '${parentId}' in parents` : query;

      const response = await this.drive.files.list({
        q: searchQuery,
        fields: 'files(id, name)'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      this.log(`📁 Created folder: ${folderName}`, 'blue');
      return folder.data.id;

    } catch (error) {
      this.log(`❌ Failed to create folder ${folderName}: ${error.message}`, 'red');
      throw error;
    }
  }

  markdownToGoogleDocs(markdown) {
    // Convert markdown to Google Docs requests
    const requests = [];
    const lines = markdown.split('\n');
    let currentIndex = 1;

    for (const line of lines) {
      let text = line;
      let style = {};

      // Headers
      if (line.startsWith('# ')) {
        text = line.substring(2);
        style = { namedStyleType: 'HEADING_1' };
      } else if (line.startsWith('## ')) {
        text = line.substring(3);
        style = { namedStyleType: 'HEADING_2' };
      } else if (line.startsWith('### ')) {
        text = line.substring(4);
        style = { namedStyleType: 'HEADING_3' };
      } else if (line.startsWith('#### ')) {
        text = line.substring(5);
        style = { namedStyleType: 'HEADING_4' };
      }

      // Insert text
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text + '\n'
        }
      });

      // Apply style if needed
      if (Object.keys(style).length > 0) {
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + text.length
            },
            paragraphStyle: style,
            fields: 'namedStyleType'
          }
        });
      }

      currentIndex += text.length + 1;
    }

    return requests;
  }

  async createOrUpdateDocument(title, content, folderId) {
    try {
      // Search for existing document
      const query = `name='${title}' and mimeType='application/vnd.google-apps.document' and trashed=false`;
      const searchQuery = folderId ? `${query} and '${folderId}' in parents` : query;

      const response = await this.drive.files.list({
        q: searchQuery,
        fields: 'files(id, name)'
      });

      let documentId;

      if (response.data.files.length > 0) {
        // Update existing document
        documentId = response.data.files[0].id;

        // Clear existing content
        const doc = await this.docs.documents.get({ documentId });
        const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

        await this.docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{
              deleteContentRange: {
                range: { startIndex: 1, endIndex }
              }
            }]
          }
        });

        this.log(`📝 Updated document: ${title}`, 'blue');
      } else {
        // Create new document
        const document = await this.docs.documents.create({
          requestBody: { title }
        });
        documentId = document.data.documentId;

        // Move to folder if specified
        if (folderId) {
          await this.drive.files.update({
            fileId: documentId,
            addParents: folderId,
            fields: 'id, parents'
          });
        }

        this.log(`📄 Created document: ${title}`, 'green');
      }

      // Add content
      const requests = this.markdownToGoogleDocs(content);
      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId,
          requestBody: { requests }
        });
      }

      return documentId;

    } catch (error) {
      this.log(`❌ Failed to create/update document '${title}': ${error.message}`, 'red');
      throw error;
    }
  }

  async syncFile(filePath, folderId) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath, '.md');
      const title = fileName === 'README' ? `${path.basename(path.dirname(filePath))} - Overview` : fileName;

      return await this.createOrUpdateDocument(title, content, folderId);
    } catch (error) {
      this.log(`❌ Failed to sync file ${filePath}: ${error.message}`, 'red');
      throw error;
    }
  }

  async syncDirectory(dirPath, parentFolderId) {
    try {
      const dirName = path.basename(dirPath);
      const folderId = await this.ensureFolder(dirName, parentFolderId);

      const items = await fs.readdir(dirPath, { withFileTypes: true });

      // Sync markdown files
      for (const item of items) {
        if (item.isFile() && item.name.endsWith('.md')) {
          const filePath = path.join(dirPath, item.name);
          await this.syncFile(filePath, folderId);
        }
      }

      // Sync subdirectories
      for (const item of items) {
        if (item.isDirectory()) {
          const subDirPath = path.join(dirPath, item.name);
          await this.syncDirectory(subDirPath, folderId);
        }
      }

    } catch (error) {
      this.log(`❌ Failed to sync directory ${dirPath}: ${error.message}`, 'red');
      throw error;
    }
  }

  async syncDocumentation() {
    try {
      this.log('🚀 Starting Google Docs sync...', 'blue');

      if (!await this.initialize()) {
        throw new Error('Failed to initialize Google Services');
      }

      // Create main documentation folder
      const mainFolderId = await this.ensureFolder('Tutorwise Documentation');

      this.log(`📁 Syncing docs from: ${config.docsPath}`, 'yellow');
      await this.syncDirectory(config.docsPath, mainFolderId);

      this.log('✅ Google Docs sync completed successfully!', 'green');

    } catch (error) {
      this.log(`❌ Sync failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async pollCalendar() {
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString(); // Next 24 hours

      const events = [];

      for (const calendarId of config.calendarIds) {
        try {
          const response = await this.calendar.events.list({
            calendarId: calendarId.trim(),
            timeMin,
            timeMax,
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
          });

          if (response.data.items.length > 0) {
            events.push(...response.data.items.map(event => ({
              calendar: calendarId,
              id: event.id,
              summary: event.summary,
              start: event.start.dateTime || event.start.date,
              end: event.end.dateTime || event.end.date,
              description: event.description,
              location: event.location
            })));
          }
        } catch (error) {
          this.log(`⚠️ Failed to fetch events from calendar ${calendarId}: ${error.message}`, 'yellow');
        }
      }

      if (events.length > 0) {
        this.log(`📅 Found ${events.length} upcoming events:`, 'magenta');
        events.forEach(event => {
          const startTime = new Date(event.start).toLocaleString();
          this.log(`  • ${event.summary} - ${startTime}`, 'magenta');
        });
      } else {
        this.log('📅 No upcoming events found', 'blue');
      }

      return events;

    } catch (error) {
      this.log(`❌ Calendar polling failed: ${error.message}`, 'red');
      return [];
    }
  }

  async startCalendarPolling() {
    if (this.pollingActive) {
      this.log('⚠️ Calendar polling is already active', 'yellow');
      return;
    }

    if (!await this.initialize()) {
      throw new Error('Failed to initialize Google Services for calendar polling');
    }

    this.pollingActive = true;
    this.log(`⏰ Starting calendar polling every ${config.pollInterval / 60000} minutes...`, 'green');

    // Initial poll
    await this.pollCalendar();

    // Set up interval
    const intervalId = setInterval(async () => {
      if (!this.pollingActive) {
        clearInterval(intervalId);
        return;
      }
      await this.pollCalendar();
    }, config.pollInterval);

    // Keep process alive
    process.on('SIGINT', () => {
      this.log('🛑 Stopping calendar polling...', 'yellow');
      this.pollingActive = false;
      clearInterval(intervalId);
      process.exit(0);
    });
  }

  stopCalendarPolling() {
    this.pollingActive = false;
    this.log('🛑 Calendar polling stopped', 'yellow');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'sync';

  const googleServices = new GoogleServicesSync();

  switch (action) {
    case 'sync-docs':
      await googleServices.syncDocumentation();
      break;
    case 'poll-calendar':
      await googleServices.startCalendarPolling();
      break;
    case 'test-calendar':
      if (await googleServices.initialize()) {
        await googleServices.pollCalendar();
      }
      break;
    case 'test':
      await googleServices.initialize();
      break;
    case 'help':
      console.log(`
Google Docs & Calendar Integration

Usage: node sync-google-docs.js [action]

Actions:
  sync-docs      Sync all documentation to Google Docs (default)
  poll-calendar  Start continuous calendar polling (10 min intervals)
  test-calendar  Test calendar access and show upcoming events
  test           Test Google Services connection
  help           Show this help message

Environment Variables:
  GOOGLE_SERVICE_ACCOUNT_PATH  Path to service account JSON file
  GOOGLE_DOCS_FOLDER_IDS       Comma-separated folder IDs for docs
  GOOGLE_CALENDAR_IDS          Comma-separated calendar IDs (default: primary)
      `);
      break;
    default:
      if (action === 'sync') {
        await googleServices.syncDocumentation();
      } else {
        console.log(`Unknown action: ${action}. Use 'help' for usage information.`);
        process.exit(1);
      }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = GoogleServicesSync;