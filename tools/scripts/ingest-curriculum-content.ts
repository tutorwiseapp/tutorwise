#!/usr/bin/env node
/**
 * Curriculum Content Ingestion Script
 *
 * Generates knowledge chunks from GCSE curriculum topics and ingests them
 * into sage_knowledge_chunks with Gemini embeddings.
 *
 * Usage:
 *   npm run ingest-curriculum [options]
 *
 * Options:
 *   --limit <n>    Only ingest first N topics (for testing)
 *   --subject <s>  Filter by subject (maths, english, science)
 *   --dry-run      Generate chunks without inserting to database
 *
 * Prerequisites:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_KEY environment variable (service_role key)
 *   - GOOGLE_AI_API_KEY environment variable
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { mathsTopics } from '../../sage/curriculum/data/maths';
import { generateAllChunks, formatChunkSummary, type GeneratedChunk } from '../../sage/curriculum/content-generator';
import type { CurriculumTopic } from '../../sage/curriculum/types';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// --- Configuration ---

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 20; // Process 20 chunks at a time
const CURRICULUM_NAMESPACE = 'global';

// Special UUID for system-owned curriculum content
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// --- Parse CLI arguments ---

const args = process.argv.slice(2);
const options = {
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined,
  subject: args.includes('--subject') ? args[args.indexOf('--subject') + 1] : undefined,
  dryRun: args.includes('--dry-run'),
};

// --- Main ingestion logic ---

async function main() {
  console.log('========================================');
  console.log('Curriculum Content Ingestion');
  console.log('========================================\n');

  // 1. Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role for system operations
  const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!options.dryRun && (!supabaseUrl || !supabaseKey)) {
    console.error('❌ Missing required environment variables for database insertion:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    console.error('   Use --dry-run to test without database access');
    process.exit(1);
  }

  if (!googleKey && !options.dryRun) {
    console.error('❌ Missing GOOGLE_AI_API_KEY environment variable');
    console.error('   Use --dry-run to test without embeddings');
    process.exit(1);
  }

  // 2. Initialize clients
  let supabase = null;
  let gemini = null;
  let embeddingModel = null;

  if (!options.dryRun && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✓ Supabase client initialized');
  }

  if (!options.dryRun && googleKey) {
    gemini = new GoogleGenerativeAI(googleKey);
    embeddingModel = gemini.getGenerativeModel({ model: EMBEDDING_MODEL });
    console.log('✓ Gemini client initialized');
  }

  console.log('');

  // 3. Load curriculum topics
  let topics: CurriculumTopic[] = mathsTopics;

  // Apply filters
  if (options.subject) {
    topics = topics.filter(t => t.subject === options.subject);
    console.log(`Filtered to subject: ${options.subject}`);
  }

  if (options.limit) {
    topics = topics.slice(0, options.limit);
    console.log(`Limited to first ${options.limit} topics`);
  }

  console.log(`\n📚 Loaded ${topics.length} curriculum topics\n`);

  // 4. Generate chunks
  console.log('Generating knowledge chunks...');
  const startGeneration = Date.now();
  const chunks = generateAllChunks(topics);
  const generationTime = Date.now() - startGeneration;

  console.log(`✓ ${formatChunkSummary(chunks)}`);
  console.log(`✓ Generation time: ${generationTime}ms\n`);

  if (options.dryRun) {
    console.log('🏁 Dry run complete. No data inserted.');
    console.log('\nSample chunk:');
    console.log('---');
    console.log(chunks[0].content);
    console.log('---');
    return;
  }

  // 5. Create curriculum document in sage_uploads
  console.log('Creating curriculum document...');
  const documentId = await createCurriculumDocument(supabase, chunks.length);
  console.log(`✓ Document created: ${documentId}\n`);

  // 6. Process chunks in batches
  console.log('Generating embeddings and inserting chunks...');
  let successCount = 0;
  let errorCount = 0;
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} chunks)... `);

    try {
      // Generate embeddings for batch
      const embeddings = await generateEmbeddings(embeddingModel, batch);

      // Insert chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        if (embedding) {
          await insertChunk(supabase, {
            documentId,
            chunk,
            embedding,
            position: i + j,
          });
          successCount++;
        } else {
          errorCount++;
        }
      }

      process.stdout.write(`✓\n`);
    } catch (error) {
      process.stdout.write(`✗ Error: ${(error as Error).message}\n`);
      errorCount += batch.length;
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 7. Update document status
  await supabase
    .from('sage_uploads')
    .update({
      chunk_count: successCount,
      embedding_status: errorCount === 0 ? 'completed' : 'failed',
    })
    .eq('id', documentId);

  // 8. Summary
  console.log('\n========================================');
  console.log('Ingestion Complete');
  console.log('========================================');
  console.log(`✓ Topics processed: ${topics.length}`);
  console.log(`✓ Chunks generated: ${chunks.length}`);
  console.log(`✓ Chunks embedded: ${successCount}`);
  if (errorCount > 0) {
    console.log(`⚠️  Errors: ${errorCount}`);
  }
  console.log(`✓ Document ID: ${documentId}`);
  console.log('========================================\n');
}

/**
 * Create a curriculum document in sage_uploads
 */
async function createCurriculumDocument(supabase: any, chunkCount: number): Promise<string> {
  const { data, error } = await supabase
    .from('sage_uploads')
    .insert({
      owner_id: SYSTEM_USER_ID,
      filename: 'gcse-maths-curriculum.txt',
      original_filename: 'GCSE Mathematics Curriculum (Generated)',
      file_type: 'text/plain',
      file_size: 0, // Virtual document
      storage_path: 'system/curriculum/gcse-maths',
      namespace: CURRICULUM_NAMESPACE,
      subject: 'maths',
      level: 'GCSE',
      chunk_count: 0,
      embedding_status: 'processing',
      visibility: 'public',
      metadata: {
        type: 'curriculum',
        generated: true,
        source: 'TutorWise Curriculum Data',
        version: '1.0',
      },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create curriculum document: ${error.message}`);
  }

  return data.id;
}

/**
 * Generate embeddings for a batch of chunks
 */
async function generateEmbeddings(
  model: any,
  chunks: GeneratedChunk[]
): Promise<(number[] | null)[]> {
  const embeddings: (number[] | null)[] = [];

  for (const chunk of chunks) {
    try {
      // Truncate if too long (Gemini has ~8000 token limit for embeddings)
      const text = chunk.content.slice(0, 8000);

      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      } as any);

      embeddings.push(result.embedding.values);
    } catch (error) {
      console.error(`\n  ⚠️  Embedding error for chunk "${chunk.topicName}": ${(error as Error).message}`);
      embeddings.push(null);
    }
  }

  return embeddings;
}

/**
 * Insert chunk into sage_knowledge_chunks
 */
async function insertChunk(
  supabase: any,
  data: {
    documentId: string;
    chunk: GeneratedChunk;
    embedding: number[];
    position: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from('sage_knowledge_chunks')
    .insert({
      document_id: data.documentId,
      content: data.chunk.content,
      embedding: data.embedding,
      metadata: {
        type: data.chunk.type,
        topicId: data.chunk.topicId,
        topicName: data.chunk.topicName,
        tier: data.chunk.tier,
        source: data.chunk.source,
        difficulty: data.chunk.metadata.difficulty,
        prerequisites: data.chunk.metadata.prerequisites,
        vocabulary: data.chunk.metadata.vocabulary,
        examBoards: data.chunk.metadata.examBoards,
      },
      position: data.position,
      page_number: null,
      namespace: CURRICULUM_NAMESPACE,
      subject: data.chunk.subject,
      level: data.chunk.level,
    });

  if (error) {
    throw new Error(`Failed to insert chunk: ${error.message}`);
  }
}

// --- Run ---

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
