/**
 * Filename: api/ai-agents/[id]/materials/route.ts
 * Purpose: AI Tutor Materials API - Upload and list materials
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - POST /api/ai-agents/[id]/materials - Upload material
 * - GET /api/ai-agents/[id]/materials - List materials
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  uploadMaterial,
  listMaterials,
  checkStorageQuota,
} from '@/lib/ai-agents/material-upload';

/**
 * POST /api/ai-agents/[id]/materials
 * Upload material (PDF/DOCX/PPTX)
 *
 * Body: FormData with 'file' field
 * Returns: { id, status, file_name, file_size_mb }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOCX, and PPTX are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (100MB max per file)
    const maxSizeMB = 100;
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeMB}MB.` },
        { status: 400 }
      );
    }

    // Check storage quota before upload
    const fileSizeMBCeil = Math.ceil(fileSizeMB);
    const quota = await checkStorageQuota(id, fileSizeMBCeil);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Storage quota exceeded. ${quota.remaining}MB remaining of ${quota.quota}MB.`,
          quota,
        },
        { status: 413 }
      );
    }

    // Upload material
    const result = await uploadMaterial(file, id, user.id);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error uploading material:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('Storage quota')) {
      return NextResponse.json({ error: errorMessage }, { status: 413 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to upload material' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-agents/[id]/materials
 * List materials for AI tutor
 *
 * Returns: Array of materials with metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: tutor } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (!tutor) {
      return NextResponse.json({ error: 'AI tutor not found or access denied' }, { status: 403 });
    }

    // List materials
    const materials = await listMaterials(id);

    // Get storage quota info
    const quota = await checkStorageQuota(id, 0);

    return NextResponse.json(
      {
        materials,
        quota: {
          used: quota.used,
          limit: quota.quota,
          remaining: quota.remaining,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error listing materials:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to list materials' },
      { status: 500 }
    );
  }
}
