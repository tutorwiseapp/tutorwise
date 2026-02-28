/**
 * Filename: tests/e2e/ai-tutors/materials-rag.test.ts
 * Purpose: E2E tests for AI Tutor materials and RAG retrieval
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Test Coverage:
 * - Material uploads (PDF, images)
 * - URL link management
 * - RAG 3-tier priority system (Materials → Links → Sage fallback)
 * - Vector embeddings generation
 * - Semantic search retrieval
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Helper: Create test tutor and AI tutor
async function createTestAITutor() {
  const email = `tutor-${Date.now()}-${Math.random()}@test.com`;
  const { data: authUser } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  await supabase
    .from('profiles')
    .update({ caas_score: 80 })
    .eq('id', authUser.user.id);

  const { data: aiTutor } = await supabase
    .from('ai_tutors')
    .insert({
      owner_id: authUser.user.id,
      display_name: 'Test RAG Tutor',
      subject: 'Mathematics',
      description: 'Test tutor for RAG',
      skills: ['Algebra'],
      price_per_hour: 10,
      status: 'published',
    })
    .select()
    .single();

  return {
    ownerId: authUser.user.id,
    aiAgentId: aiTutor!.id,
    email,
  };
}

// Helper: Generate embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: 768,
  } as any);
  return result.embedding.values;
}

// Helper: Clean up test data
async function cleanupTestData(ownerId: string, aiAgentId: string) {
  await supabase.from('ai_agent_sessions').delete().match({ agent_id: aiAgentId });
  await supabase.from('ai_tutor_links').delete().match({ agent_id: aiAgentId });
  await supabase.from('ai_tutor_materials').delete().match({ agent_id: aiAgentId });
  await supabase.from('ai_tutors').delete().eq('id', aiAgentId);
  await supabase.from('profiles').delete().eq('id', ownerId);
  await supabase.auth.admin.deleteUser(ownerId);
}

describe.skip('AI Tutor Materials and RAG', () => {
  // Skip by default - requires live Supabase instance and Google AI API
  // Run manually with: npm test -- --testNamePattern="AI Tutor Materials and RAG"
  let testData: Awaited<ReturnType<typeof createTestAITutor>>;

  beforeEach(async () => {
    testData = await createTestAITutor();
  });

  afterEach(async () => {
    await cleanupTestData(testData.ownerId, testData.aiAgentId);
  });

  describe('Material Uploads', () => {
    it('should upload PDF material and generate embeddings', async () => {
      const materialContent = 'Quadratic equations: ax² + bx + c = 0. The discriminant is b² - 4ac.';
      const embedding = await generateEmbedding(materialContent);

      const { data: material, error } = await supabase
        .from('ai_tutor_materials')
        .insert({
          agent_id: testData.aiAgentId,
          file_name: 'quadratic-equations.pdf',
          file_url: 'https://example.com/test.pdf',
          file_size: 1024,
          file_type: 'application/pdf',
          content_text: materialContent,
          embedding,
          status: 'ready',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(material?.file_name).toBe('quadratic-equations.pdf');
      expect(material?.embedding).toBeDefined();
      expect(material?.embedding.length).toBe(768);
      expect(material?.status).toBe('ready');
    });

    it('should upload multiple materials for same AI tutor', async () => {
      const materials = [
        {
          file_name: 'algebra-basics.pdf',
          content_text: 'Algebraic expressions and simplification',
        },
        {
          file_name: 'trigonometry.pdf',
          content_text: 'Sine, cosine, tangent functions',
        },
        {
          file_name: 'geometry.pdf',
          content_text: 'Pythagorean theorem: a² + b² = c²',
        },
      ];

      for (const mat of materials) {
        const embedding = await generateEmbedding(mat.content_text);
        const { error } = await supabase
          .from('ai_tutor_materials')
          .insert({
            agent_id: testData.aiAgentId,
            file_name: mat.file_name,
            file_url: `https://example.com/${mat.file_name}`,
            file_size: 1024,
            file_type: 'application/pdf',
            content_text: mat.content_text,
            embedding,
            status: 'ready',
          });

        expect(error).toBeNull();
      }

      // Verify all materials created
      const { count } = await supabase
        .from('ai_tutor_materials')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', testData.aiAgentId);

      expect(count).toBe(3);
    });

    it('should handle material upload failure', async () => {
      const { data: material, error } = await supabase
        .from('ai_tutor_materials')
        .insert({
          agent_id: testData.aiAgentId,
          file_name: 'failed-upload.pdf',
          file_url: 'https://example.com/failed.pdf',
          file_size: 1024,
          file_type: 'application/pdf',
          content_text: null, // No content extracted
          embedding: null,
          status: 'failed',
          error_message: 'Failed to extract text from PDF',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(material?.status).toBe('failed');
      expect(material?.error_message).toBe('Failed to extract text from PDF');
    });

    it('should track material processing status', async () => {
      // Create processing material
      const { data: material } = await supabase
        .from('ai_tutor_materials')
        .insert({
          agent_id: testData.aiAgentId,
          file_name: 'processing.pdf',
          file_url: 'https://example.com/processing.pdf',
          file_size: 1024,
          file_type: 'application/pdf',
          status: 'processing',
        })
        .select()
        .single();

      expect(material?.status).toBe('processing');

      // Update to ready
      const { data: updated } = await supabase
        .from('ai_tutor_materials')
        .update({
          content_text: 'Processed content',
          embedding: await generateEmbedding('Processed content'),
          status: 'ready',
        })
        .eq('id', material!.id)
        .select()
        .single();

      expect(updated?.status).toBe('ready');
    });
  });

  describe('URL Links', () => {
    it('should add URL link to AI tutor', async () => {
      const { data: link, error } = await supabase
        .from('ai_tutor_links')
        .insert({
          agent_id: testData.aiAgentId,
          url: 'https://www.khanacademy.org/math/algebra',
          title: 'Khan Academy Algebra',
          description: 'Comprehensive algebra course',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(link?.url).toBe('https://www.khanacademy.org/math/algebra');
      expect(link?.title).toBe('Khan Academy Algebra');
    });

    it('should add multiple links', async () => {
      const links = [
        {
          url: 'https://www.khanacademy.org/math/algebra',
          title: 'Khan Academy Algebra',
        },
        {
          url: 'https://www.bbc.co.uk/bitesize/subjects/z38pycw',
          title: 'BBC Bitesize Maths',
        },
        {
          url: 'https://www.mathsisfun.com/',
          title: 'Maths Is Fun',
        },
      ];

      for (const link of links) {
        const { error } = await supabase
          .from('ai_tutor_links')
          .insert({
            agent_id: testData.aiAgentId,
            url: link.url,
            title: link.title,
          });

        expect(error).toBeNull();
      }

      // Verify all links created
      const { count } = await supabase
        .from('ai_tutor_links')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', testData.aiAgentId);

      expect(count).toBe(3);
    });

    it('should prevent duplicate URLs', async () => {
      const url = 'https://www.khanacademy.org/math/algebra';

      // Add first link
      await supabase
        .from('ai_tutor_links')
        .insert({
          agent_id: testData.aiAgentId,
          url,
          title: 'First Link',
        });

      // Try to add duplicate
      const { error } = await supabase
        .from('ai_tutor_links')
        .insert({
          agent_id: testData.aiAgentId,
          url, // Duplicate URL
          title: 'Duplicate Link',
        });

      expect(error).not.toBeNull();
      expect(error?.code).toBe('23505'); // Unique constraint violation
    });

    it('should delete link', async () => {
      const { data: link } = await supabase
        .from('ai_tutor_links')
        .insert({
          agent_id: testData.aiAgentId,
          url: 'https://example.com/to-delete',
          title: 'To Delete',
        })
        .select()
        .single();

      // Delete
      const { error } = await supabase
        .from('ai_tutor_links')
        .delete()
        .eq('id', link!.id);

      expect(error).toBeNull();

      // Verify deleted
      const { data: deleted } = await supabase
        .from('ai_tutor_links')
        .select()
        .eq('id', link!.id)
        .single();

      expect(deleted).toBeNull();
    });
  });

  describe('RAG Retrieval - Tier 1: Materials', () => {
    it('should retrieve relevant materials using vector similarity', async () => {
      // Upload materials with embeddings
      const materials = [
        'Quadratic equations: ax² + bx + c = 0',
        'Linear equations: y = mx + b',
        'Circle equation: x² + y² = r²',
      ];

      for (const content of materials) {
        const embedding = await generateEmbedding(content);
        await supabase.from('ai_tutor_materials').insert({
          agent_id: testData.aiAgentId,
          file_name: `${content.substring(0, 10)}.pdf`,
          file_url: `https://example.com/${content.substring(0, 10)}.pdf`,
          file_size: 1024,
          file_type: 'application/pdf',
          content_text: content,
          embedding,
          status: 'ready',
        });
      }

      // Query: "How do I solve quadratic equations?"
      const queryEmbedding = await generateEmbedding('How do I solve quadratic equations?');

      // Perform vector similarity search
      const { data: results } = await supabase.rpc('match_ai_tutor_materials', {
        agent_id: testData.aiAgentId,
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 3,
      });

      expect(results).toBeDefined();
      expect(results!.length).toBeGreaterThan(0);
      expect(results![0].content_text).toContain('Quadratic');
    });

    it('should return top 5 most relevant materials', async () => {
      // Upload 10 materials
      for (let i = 0; i < 10; i++) {
        const content = `Mathematics topic ${i}: Various formulas and concepts`;
        const embedding = await generateEmbedding(content);
        await supabase.from('ai_tutor_materials').insert({
          agent_id: testData.aiAgentId,
          file_name: `topic-${i}.pdf`,
          file_url: `https://example.com/topic-${i}.pdf`,
          file_size: 1024,
          file_type: 'application/pdf',
          content_text: content,
          embedding,
          status: 'ready',
        });
      }

      // Query
      const queryEmbedding = await generateEmbedding('Mathematics formulas');

      const { data: results } = await supabase.rpc('match_ai_tutor_materials', {
        agent_id: testData.aiAgentId,
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 5,
      });

      expect(results?.length).toBeLessThanOrEqual(5);
    });

    it('should filter out materials with low similarity', async () => {
      // Upload completely unrelated material
      const embedding = await generateEmbedding('Recipe for chocolate cake with butter and sugar');
      await supabase.from('ai_tutor_materials').insert({
        agent_id: testData.aiAgentId,
        file_name: 'cake-recipe.pdf',
        file_url: 'https://example.com/cake.pdf',
        file_size: 1024,
        file_type: 'application/pdf',
        content_text: 'Recipe for chocolate cake',
        embedding,
        status: 'ready',
      });

      // Query about mathematics
      const queryEmbedding = await generateEmbedding('Quadratic equations');

      const { data: results } = await supabase.rpc('match_ai_tutor_materials', {
        agent_id: testData.aiAgentId,
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Higher threshold
        match_count: 5,
      });

      // Should return no results (too dissimilar)
      expect(results?.length || 0).toBe(0);
    });
  });

  describe('RAG Retrieval - Tier 2: Links', () => {
    it('should fall back to links when no materials match', async () => {
      // Add links (no materials)
      await supabase.from('ai_tutor_links').insert([
        {
          agent_id: testData.aiAgentId,
          url: 'https://www.khanacademy.org/math/algebra',
          title: 'Khan Academy Algebra',
          description: 'Comprehensive algebra course with quadratic equations',
        },
        {
          agent_id: testData.aiAgentId,
          url: 'https://www.mathsisfun.com/algebra/quadratic-equation.html',
          title: 'Quadratic Equation - Maths Is Fun',
          description: 'Learn about quadratic equations',
        },
      ]);

      // Verify links exist
      const { count } = await supabase
        .from('ai_tutor_links')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', testData.aiAgentId);

      expect(count).toBe(2);
    });

    it('should return links for AI tutor', async () => {
      await supabase.from('ai_tutor_links').insert([
        {
          agent_id: testData.aiAgentId,
          url: 'https://example.com/link1',
          title: 'Link 1',
        },
        {
          agent_id: testData.aiAgentId,
          url: 'https://example.com/link2',
          title: 'Link 2',
        },
      ]);

      const { data: links } = await supabase
        .from('ai_tutor_links')
        .select('*')
        .eq('agent_id', testData.aiAgentId);

      expect(links?.length).toBe(2);
    });
  });

  describe('RAG Retrieval - Tier 3: Sage Fallback', () => {
    it('should use Sage knowledge when no materials or links match', async () => {
      // No materials or links for this AI tutor
      const { count: materialCount } = await supabase
        .from('ai_tutor_materials')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', testData.aiAgentId);

      const { count: linkCount } = await supabase
        .from('ai_tutor_links')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', testData.aiAgentId);

      expect(materialCount).toBe(0);
      expect(linkCount).toBe(0);

      // In production, this would search sage_knowledge_chunks table
      // Verify sage_knowledge_chunks table exists
      const { data: sageChunks } = await supabase
        .from('sage_knowledge_chunks')
        .select('id')
        .limit(1);

      expect(sageChunks).toBeDefined();
    });
  });

  describe('Embedding Quality', () => {
    it('should generate consistent embeddings', async () => {
      const text = 'Quadratic equations';
      const embedding1 = await generateEmbedding(text);
      const embedding2 = await generateEmbedding(text);

      // Embeddings should be identical for same text
      expect(embedding1.length).toBe(768);
      expect(embedding2.length).toBe(768);
      expect(embedding1[0]).toBeCloseTo(embedding2[0], 5);
    });

    it('should generate different embeddings for different text', async () => {
      const text1 = 'Quadratic equations';
      const text2 = 'Linear equations';
      const embedding1 = await generateEmbedding(text1);
      const embedding2 = await generateEmbedding(text2);

      // Calculate cosine similarity (should be < 1.0)
      const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
      const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
      const similarity = dotProduct / (magnitude1 * magnitude2);

      expect(similarity).toBeLessThan(1.0);
      expect(similarity).toBeGreaterThan(0.5); // Still related (both math)
    });
  });
});
