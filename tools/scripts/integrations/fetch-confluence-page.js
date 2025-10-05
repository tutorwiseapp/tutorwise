#!/usr/bin/env node

/**
 * Fetch a specific Confluence page by ID
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

const config = {
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_EMAIL,
  token: process.env.JIRA_API_TOKEN
};

async function fetchPage(pageId) {
  try {
    if (!config.baseUrl || !config.email || !config.token) {
      console.error('❌ Missing credentials. Ensure JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are set in .env.local');
      process.exit(1);
    }

    const api = axios.create({
      baseURL: `${config.baseUrl}/wiki/rest/api`,
      auth: {
        username: config.email,
        password: config.token
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`🔍 Fetching Confluence page ${pageId}...`);
    const response = await api.get(`/content/${pageId}`, {
      params: {
        expand: 'body.storage,version,space'
      }
    });

    const page = response.data;
    console.log('\n📄 === Page Information ===');
    console.log(`Title: ${page.title}`);
    console.log(`Space: ${page.space.name} (${page.space.key})`);
    console.log(`Version: ${page.version.number}`);
    console.log(`URL: ${config.baseUrl}/wiki${page._links.webui}`);
    console.log('\n📝 === Content ===\n');

    // Convert basic HTML to readable format
    let content = page.body.storage.value;
    content = content.replace(/<h1>/g, '\n# ');
    content = content.replace(/<h2>/g, '\n## ');
    content = content.replace(/<h3>/g, '\n### ');
    content = content.replace(/<h4>/g, '\n#### ');
    content = content.replace(/<\/h[1-6]>/g, '\n');
    content = content.replace(/<p>/g, '\n');
    content = content.replace(/<\/p>/g, '\n');
    content = content.replace(/<br\s*\/?>/g, '\n');
    content = content.replace(/<li>/g, '\n- ');
    content = content.replace(/<\/li>/g, '');
    content = content.replace(/<ul>/g, '\n');
    content = content.replace(/<\/ul>/g, '\n');
    content = content.replace(/<ol>/g, '\n');
    content = content.replace(/<\/ol>/g, '\n');
    content = content.replace(/<strong>/g, '**');
    content = content.replace(/<\/strong>/g, '**');
    content = content.replace(/<em>/g, '*');
    content = content.replace(/<\/em>/g, '*');
    content = content.replace(/<code>/g, '`');
    content = content.replace(/<\/code>/g, '`');
    content = content.replace(/<[^>]+>/g, '');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&quot;/g, '"');
    content = content.replace(/&#39;/g, "'");

    console.log(content);

    return { page, content };

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.error('Authentication failed. Check your JIRA_EMAIL and JIRA_API_TOKEN.');
    } else if (error.response?.status === 404) {
      console.error(`Page ${pageId} not found. Check the page ID.`);
    }
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const pageId = process.argv[2];

  if (!pageId) {
    console.log('Usage: node fetch-confluence-page.js <page-id>');
    console.log('Example: node fetch-confluence-page.js 13008898');
    process.exit(1);
  }

  fetchPage(pageId);
}

module.exports = { fetchPage };
