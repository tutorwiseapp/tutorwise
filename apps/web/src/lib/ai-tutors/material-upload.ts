/**
 * Filename: material-upload.ts
 * Purpose: Material Upload Service (Stub - to be implemented)
 * Created: 2026-02-23
 * Version: v1.0 (Stub)
 */

import { createClient } from '@/utils/supabase/server';

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
export async function listMaterials(aiTutorId: string): Promise<Material[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutor_materials')
    .select('*')
    .eq('ai_tutor_id', aiTutorId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Upload material (stub - to be implemented)
 * TODO: Implement file upload, processing, and embedding
 */
export async function uploadMaterial(
  file: File,
  aiTutorId: string,
  userId: string
): Promise<Material> {
  const supabase = await createClient();

  // Verify ownership
  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('owner_id')
    .eq('id', aiTutorId)
    .eq('owner_id', userId)
    .single();

  if (!tutor) {
    throw new Error('AI tutor not found or access denied');
  }

  // TODO: Implement file upload to Supabase Storage
  // TODO: Implement document processing
  // TODO: Implement embedding generation
  // TODO: Implement chunk storage

  throw new Error('Material upload not yet implemented');
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
    .select('ai_tutor_id, ai_tutors!inner(owner_id)')
    .eq('id', materialId)
    .single();

  if (!material || (material as any).ai_tutors.owner_id !== userId) {
    throw new Error('Material not found or access denied');
  }

  // Delete material (cascades to chunks)
  const { error } = await supabase
    .from('ai_tutor_materials')
    .delete()
    .eq('id', materialId);

  if (error) throw error;
}

/**
 * Check storage quota for AI tutor
 */
export async function checkStorageQuota(
  aiTutorId: string,
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
    .eq('id', aiTutorId)
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
