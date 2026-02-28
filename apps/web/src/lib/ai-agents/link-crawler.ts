/**
 * Filename: lib/ai-agents/link-crawler.ts
 * Purpose: Fetch and extract text content from URLs
 * Created: 2026-02-28
 *
 * Crawls link URLs, strips HTML to plain text, and returns
 * the content for chunking and embedding.
 */

/**
 * Fetch a URL and extract text content.
 * Strips HTML tags and normalizes whitespace.
 */
export async function crawlLink(url: string): Promise<{
  text: string;
  title: string;
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TutorWise-Bot/1.0 (educational content indexer)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      return { text: '', title: '', success: false, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { text: '', title: '', success: false, error: `Unsupported content type: ${contentType}` };
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Strip HTML to text
    const text = stripHtml(html);

    if (text.length < 50) {
      return { text: '', title, success: false, error: 'Content too short after extraction' };
    }

    return { text, title, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { text: '', title: '', success: false, error: message };
  }
}

/**
 * Strip HTML tags and normalize whitespace.
 * Removes scripts, styles, and non-content elements.
 */
function stripHtml(html: string): string {
  let text = html;

  // Remove scripts, styles, and other non-content
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ');
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ');

  // Replace block-level elements with newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th|blockquote|pre)[^>]*>/gi, '\n');

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');

  // Normalize whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();

  return text;
}
