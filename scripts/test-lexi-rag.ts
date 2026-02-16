/**
 * Test Lexi RAG Retrieval
 *
 * Verifies that vector similarity search works against the seeded knowledge base.
 *
 * Usage: npx tsx scripts/test-lexi-rag.ts
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lvsmtgmpoysjygdwcrir.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_API_KEY || '';
const EMBEDDING_DIMENSIONS = 768;

async function generateEmbedding(text: string): Promise<number[]> {
  const gemini = new GoogleGenerativeAI(GOOGLE_AI_KEY);
  const model = gemini.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  } as any);
  return result.embedding.values;
}

async function testQuery(supabase: any, query: string) {
  console.log(`\n--- Query: "${query}" ---`);

  const embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('match_lexi_knowledge_chunks', {
    query_embedding: embedding,
    match_category: null,
    match_count: 3,
    match_threshold: 0.5,
  });

  if (error) {
    console.error('Search error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No results found');
    return;
  }

  for (const row of data) {
    console.log(`  [${row.similarity.toFixed(3)}] ${row.metadata?.title || 'Unknown'} — ${row.metadata?.section || 'overview'}`);
    console.log(`  ${row.content.substring(0, 120)}...`);
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Test various queries that map to different platform features
  const queries = [
    'How do referrals work?',
    'How do I get paid as a tutor?',
    'What is EduPay wallet?',
    'How to use VirtualSpace whiteboard?',
    'What is the Credibility Score?',
    'How to book a tutor?',
    'How do I connect my Google Calendar?',
  ];

  for (const query of queries) {
    await testQuery(supabase, query);
  }

  console.log('\n✅ RAG retrieval test complete');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
