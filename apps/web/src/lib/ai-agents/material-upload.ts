/**
 * Filename: material-upload.ts
 * Purpose: Material Upload Service for AI Tutors
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Reuses Sage DocumentProcessor for text extraction. Embeddings via Gemini directly.
 */

import { createClient } from '@/utils/supabase/server';
import { DocumentProcessor } from '@sage/upload/processor';

export interface Material {
  id: string;
  ai_tutor_id: string;
  file_name: string;
  file_type: string;
  file_size_mb: number;
  file_url: string;
  status: string;
  error_message?: string;
  page_count?: number;
  word_count?: number;
  chunk_count?: number;
  uploaded_at: string;
  processed_at?: string;
}

/**
 * List materials for AI tutor
 */
export async function listMaterials(aiAgentId: string): Promise<Material[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutor_materials')
    .select('*')
    .eq('ai_tutor_id', aiAgentId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Upload material for AI tutor
 *
 * Flow:
 * 1. Check storage quota
 * 2. Upload file to Supabase Storage
 * 3. Create material record
 * 4. Process document (extract text, generate embeddings, store chunks)
 * 5. Update material status and storage usage
 */
export async function uploadMaterial(
  file: File,
  aiAgentId: string,
  userId: string
): Promise<Material> {
  const supabase = await createClient();

  // Verify ownership
  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('owner_id, storage_used_mb, storage_limit_mb')
    .eq('id', aiAgentId)
    .eq('owner_id', userId)
    .single();

  if (!tutor) {
    throw new Error('AI tutor not found or access denied');
  }

  // Check storage quota
  const fileSizeMB = Math.ceil(file.size / (1024 * 1024));
  const used = tutor.storage_used_mb || 0;
  const limit = tutor.storage_limit_mb || 1024;

  if (used + fileSizeMB > limit) {
    throw new Error(`Storage quota exceeded. ${Math.max(0, limit - used)}MB remaining of ${limit}MB.`);
  }

  // Upload file to Supabase Storage
  const fileId = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `ai-agents/${aiAgentId}/${fileId}.${ext}`;

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('ai-tutor-materials')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('ai-tutor-materials')
    .getPublicUrl(storagePath);

  // Create material record (status: processing)
  const { data: material, error: insertError } = await supabase
    .from('ai_tutor_materials')
    .insert({
      ai_tutor_id: aiAgentId,
      file_name: file.name,
      file_type: ext,
      file_size_mb: fileSizeMB,
      file_url: urlData.publicUrl,
      status: 'processing',
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Process document asynchronously (don't await in request handler)
  processAndEmbedMaterial(material.id, aiAgentId, fileBuffer, file.name, fileSizeMB)
    .catch(err => console.error('[MaterialUpload] Background processing failed:', err));

  return material;
}

/**
 * Process document: extract text, chunk, embed, store
 * Reuses Sage DocumentProcessor for text extraction
 */
async function processAndEmbedMaterial(
  materialId: string,
  aiAgentId: string,
  buffer: Buffer,
  filename: string,
  _fileSizeMB: number
): Promise<void> {
  const supabase = await createClient();

  try {
    // 1. Extract text using Sage DocumentProcessor
    const processor = new DocumentProcessor({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    const processed = await processor.process(buffer, filename);

    if (processed.chunks.length === 0) {
      await supabase
        .from('ai_tutor_materials')
        .update({ status: 'failed', error_message: 'No text content extracted' })
        .eq('id', materialId);
      return;
    }

    // 2. Generate embeddings using Gemini directly
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!googleKey) throw new Error('Google AI API key not configured');

    const genAI = new GoogleGenerativeAI(googleKey);
    const embModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    let chunksStored = 0;

    // Process chunks in batches
    for (let i = 0; i < processed.chunks.length; i += 20) {
      const batch = processed.chunks.slice(i, i + 20);

      for (const chunk of batch) {
        try {
          const truncated = chunk.content.slice(0, 8000);
          const result = await embModel.embedContent({
            content: { role: 'user', parts: [{ text: truncated }] },
            outputDimensionality: 768,
          } as any);

          const embedding = result.embedding.values;

          await supabase
            .from('ai_tutor_material_chunks')
            .insert({
              material_id: materialId,
              ai_tutor_id: aiAgentId,
              chunk_text: chunk.content,
              chunk_index: chunk.position,
              page_number: chunk.pageNumber || null,
              embedding: JSON.stringify(embedding),
            });

          chunksStored++;
        } catch (err) {
          console.error(`[MaterialUpload] Failed to embed chunk ${chunk.position}:`, err);
        }
      }
    }

    // 4. Update material status
    await supabase
      .from('ai_tutor_materials')
      .update({
        status: chunksStored > 0 ? 'ready' : 'failed',
        error_message: chunksStored === 0 ? 'No chunks could be embedded' : null,
        processed_at: new Date().toISOString(),
        page_count: processed.metadata.pageCount || null,
        word_count: processed.metadata.wordCount || null,
        chunk_count: chunksStored,
      })
      .eq('id', materialId);

    // 5. Update storage usage
    const { data: totalStorage } = await supabase
      .from('ai_tutor_materials')
      .select('file_size_mb')
      .eq('ai_tutor_id', aiAgentId);

    const totalUsed = (totalStorage || []).reduce((sum, m) => sum + (m.file_size_mb || 0), 0);

    await supabase
      .from('ai_tutors')
      .update({ storage_used_mb: Math.ceil(totalUsed) })
      .eq('id', aiAgentId);

    console.log(`[MaterialUpload] Processed ${filename}: ${chunksStored}/${processed.chunks.length} chunks embedded`);
  } catch (error) {
    console.error('[MaterialUpload] Processing failed:', error);

    await supabase
      .from('ai_tutor_materials')
      .update({
        status: 'failed',
        error_message: (error as Error).message,
      })
      .eq('id', materialId);
  }
}

/**
 * Delete material
 */
export async function deleteMaterial(
  materialId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Verify ownership via AI tutor
  const { data: material } = await supabase
    .from('ai_tutor_materials')
    .select('ai_tutor_id, file_url, file_size_mb, ai_tutors!inner(owner_id)')
    .eq('id', materialId)
    .single();

  if (!material || (material as any).ai_tutors.owner_id !== userId) {
    throw new Error('Material not found or access denied');
  }

  // Delete from storage (extract path from URL)
  const url = material.file_url;
  const pathMatch = url.match(/ai-tutors\/.+/);
  if (pathMatch) {
    await supabase.storage
      .from('ai-tutor-materials')
      .remove([pathMatch[0]]);
  }

  // Delete material (cascades to chunks)
  const { error } = await supabase
    .from('ai_tutor_materials')
    .delete()
    .eq('id', materialId);

  if (error) throw error;

  // Update storage usage
  const { data: totalStorage } = await supabase
    .from('ai_tutor_materials')
    .select('file_size_mb')
    .eq('ai_tutor_id', material.ai_tutor_id);

  const totalUsed = (totalStorage || []).reduce((sum, m) => sum + (m.file_size_mb || 0), 0);

  await supabase
    .from('ai_tutors')
    .update({ storage_used_mb: Math.ceil(totalUsed) })
    .eq('id', material.ai_tutor_id);
}

/**
 * Check storage quota for AI tutor
 */
export async function checkStorageQuota(
  aiAgentId: string,
  newFileSizeMB: number
): Promise<{
  allowed: boolean;
  remaining: number;
  quota: number;
  used: number;
}> {
  const supabase = await createClient();

  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('storage_used_mb, storage_limit_mb')
    .eq('id', aiAgentId)
    .single();

  if (!tutor) {
    throw new Error('AI tutor not found');
  }

  const used = tutor.storage_used_mb || 0;
  const quota = tutor.storage_limit_mb || 1024;
  const remaining = Math.max(0, quota - used);
  const allowed = (used + newFileSizeMB) <= quota;

  return {
    allowed,
    remaining,
    quota,
    used,
  };
}
