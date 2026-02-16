/**
 * Seed Lexi Knowledge Base
 *
 * Standalone script to read Help Centre MDX articles and seed them
 * into the lexi_knowledge_chunks table with Gemini embeddings.
 *
 * Usage: npx tsx scripts/seed-lexi-knowledge.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lvsmtgmpoysjygdwcrir.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_API_KEY || '';
const CONTENT_DIR = path.join(__dirname, '../apps/web/src/content/help-centre');
const LEXI_NAMESPACE = 'lexi/platform';
const EMBEDDING_DIMENSIONS = 768;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

// --- Article Loading ---

interface Article {
  title: string;
  slug: string;
  category: string;
  audience?: string;
  description: string;
  keywords?: string[];
  content: string;
}

function loadArticles(): Article[] {
  const articles: Article[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const { data, content } = matter(raw);
        const relPath = path.relative(CONTENT_DIR, fullPath);
        const category = path.dirname(relPath).split(path.sep)[0];

        articles.push({
          title: data.title || entry.name,
          slug: data.slug || entry.name.replace(/\.(mdx?|md)$/, ''),
          category: data.category || category,
          audience: data.audience,
          description: data.description || '',
          keywords: data.keywords,
          content,
        });
      }
    }
  }

  walk(CONTENT_DIR);
  return articles;
}

// --- Text Processing ---

function stripMDX(content: string): string {
  return content
    .replace(/^import\s+.*$/gm, '')
    .replace(/<CalloutBox[^>]*>/g, '')
    .replace(/<\/CalloutBox>/g, '')
    .replace(/<Tabs[^>]*>[\s\S]*?<\/Tabs>/g, '')
    .replace(/<VideoEmbed[^>]*\/>/g, '')
    .replace(/<CodeBlock[^>]*>[\s\S]*?<\/CodeBlock>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitBySections(content: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  const parts = content.split(/^## /gm);
  for (const part of parts) {
    if (!part.trim()) continue;
    const nl = part.indexOf('\n');
    if (nl === -1) {
      sections.push({ heading: '', content: part.trim() });
    } else {
      sections.push({
        heading: part.substring(0, nl).trim(),
        content: part.substring(nl + 1).trim(),
      });
    }
  }
  return sections;
}

function splitIntoChunks(text: string, size: number, overlap: number): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + size;
    if (end < text.length) {
      const pb = text.lastIndexOf('\n\n', end);
      if (pb > start + size * 0.5) end = pb;
      else {
        const sb = text.lastIndexOf('. ', end);
        if (sb > start + size * 0.5) end = sb + 1;
      }
    }
    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
  }
  return chunks;
}

interface ChunkData {
  content: string;
  metadata: {
    title: string;
    category: string;
    slug: string;
    audience?: string;
    section?: string;
    keywords?: string[];
  };
}

function chunkArticle(article: Article): ChunkData[] {
  const clean = stripMDX(article.content);
  const sections = splitBySections(clean);
  const chunks: ChunkData[] = [];

  // Overview chunk
  chunks.push({
    content: `${article.title}: ${article.description}`,
    metadata: {
      title: article.title,
      category: article.category,
      slug: article.slug,
      audience: article.audience,
      section: 'overview',
      keywords: article.keywords,
    },
  });

  for (const section of sections) {
    const sectionChunks = splitIntoChunks(section.content, CHUNK_SIZE, CHUNK_OVERLAP);
    for (const chunkContent of sectionChunks) {
      if (chunkContent.trim().length < 50) continue;
      chunks.push({
        content: section.heading ? `${section.heading}\n\n${chunkContent}` : chunkContent,
        metadata: {
          title: article.title,
          category: article.category,
          slug: article.slug,
          audience: article.audience,
          section: section.heading || undefined,
          keywords: article.keywords,
        },
      });
    }
  }

  return chunks;
}

// --- Main ---

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!GOOGLE_AI_KEY) {
    console.error('Missing GOOGLE_AI_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const gemini = new GoogleGenerativeAI(GOOGLE_AI_KEY);
  const model = gemini.getGenerativeModel({ model: 'gemini-embedding-001' });

  console.log('Loading Help Centre articles...');
  const articles = loadArticles();
  console.log(`Found ${articles.length} articles`);

  if (articles.length === 0) {
    console.error('No articles found in', CONTENT_DIR);
    process.exit(1);
  }

  // Clear existing chunks
  console.log('Clearing existing lexi/platform chunks...');
  const { error: deleteError } = await supabase
    .from('lexi_knowledge_chunks')
    .delete()
    .eq('namespace', LEXI_NAMESPACE);

  if (deleteError) {
    console.error('Failed to clear chunks:', deleteError.message);
    process.exit(1);
  }

  // Process each article
  let totalChunks = 0;
  let totalErrors = 0;

  for (const article of articles) {
    const chunks = chunkArticle(article);
    let stored = 0;

    // Process chunks in batches of 20
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);
      const embeddings: (number[] | null)[] = [];

      for (const chunk of batch) {
        try {
          const result = await model.embedContent({
            content: { role: 'user', parts: [{ text: chunk.content.substring(0, 8000) }] },
            outputDimensionality: EMBEDDING_DIMENSIONS,
          } as any);
          embeddings.push(result.embedding.values);
        } catch (err) {
          console.error(`  Embedding error: ${err instanceof Error ? err.message : err}`);
          embeddings.push(null);
          totalErrors++;
        }
      }

      const rows = batch
        .map((chunk, idx) => {
          if (!embeddings[idx]) return null;
          return {
            content: chunk.content,
            embedding: `[${embeddings[idx]!.join(',')}]`,
            metadata: chunk.metadata,
            namespace: LEXI_NAMESPACE,
            category: chunk.metadata.category,
            position: i + idx,
          };
        })
        .filter(Boolean);

      if (rows.length > 0) {
        const { error } = await supabase
          .from('lexi_knowledge_chunks')
          .insert(rows);

        if (error) {
          console.error(`  Insert error: ${error.message}`);
          totalErrors++;
        } else {
          stored += rows.length;
        }
      }

      // Small delay to respect Gemini rate limits
      if (i + 20 < chunks.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    totalChunks += stored;
    console.log(`  ${article.title} (${article.category}): ${stored} chunks`);
  }

  console.log(`\nDone! ${articles.length} articles → ${totalChunks} chunks (${totalErrors} errors)`);

  // Verify
  const { count } = await supabase
    .from('lexi_knowledge_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('namespace', LEXI_NAMESPACE);

  console.log(`Verified: ${count} chunks in database`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
