/**
 * Sage Materials API
 *
 * GET /api/sage/materials - Get uploaded learning materials
 * POST /api/sage/materials - Upload a new learning material
 * DELETE /api/sage/materials - Delete a learning material
 *
 * @module api/sage/materials
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface Material {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  subject?: string;
  level?: string;
  description?: string;
  tags?: string[];
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/sage/materials
 * Get uploaded learning materials for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('sage_materials')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (subject) {
      query = query.eq('subject', subject);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: materials, error } = await query;

    if (error) {
      // If table doesn't exist or other setup issue, return empty results gracefully
      // This handles cases where the sage_materials table hasn't been created yet
      console.warn('[Sage Materials] Database error (may be missing table):', error.message);
      return NextResponse.json({
        materials: [],
        total: 0,
        limit,
        offset,
      });
    }

    // Get total count
    const { count } = await supabase
      .from('sage_materials')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const formattedMaterials: Material[] = (materials || []).map(m => ({
      id: m.id,
      userId: m.user_id,
      filename: m.filename,
      originalName: m.original_name,
      mimeType: m.mime_type,
      size: m.size,
      subject: m.subject,
      level: m.level,
      description: m.description,
      tags: m.tags,
      status: m.status,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    return NextResponse.json({
      materials: formattedMaterials,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Sage Materials] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sage/materials
 * Upload a new learning material
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subject = formData.get('subject') as string | null;
    const level = formData.get('level') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required', code: 'MISSING_FILE' },
        { status: 400 }
      );
    }

    // Validate file size (10MB for students)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'bin';
    const filename = `${user.id}/${timestamp}_${random}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sage-materials')
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Sage Materials] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', code: 'UPLOAD_ERROR' },
        { status: 500 }
      );
    }

    // Create database record
    const { data: material, error: dbError } = await supabase
      .from('sage_materials')
      .insert({
        user_id: user.id,
        filename: uploadData.path,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
        subject,
        level,
        description,
        status: 'processing',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Sage Materials] Database error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('sage-materials').remove([filename]);
      return NextResponse.json(
        { error: 'Failed to save material record', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    // TODO: Trigger async processing (text extraction, embedding generation)
    // This would be done via a background job or edge function

    return NextResponse.json({
      material: {
        id: material.id,
        userId: material.user_id,
        filename: material.filename,
        originalName: material.original_name,
        mimeType: material.mime_type,
        size: material.size,
        subject: material.subject,
        level: material.level,
        description: material.description,
        status: material.status,
        createdAt: material.created_at,
      },
    });
  } catch (error) {
    console.error('[Sage Materials] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sage/materials
 * Delete a learning material
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('id');

    if (!materialId) {
      return NextResponse.json(
        { error: 'Material ID required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    // Get material to verify ownership
    const { data: material, error: fetchError } = await supabase
      .from('sage_materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (fetchError || !material) {
      return NextResponse.json(
        { error: 'Material not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (material.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Delete from storage
    await supabase.storage
      .from('sage-materials')
      .remove([material.filename]);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('sage_materials')
      .delete()
      .eq('id', materialId);

    if (deleteError) {
      console.error('[Sage Materials] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete material', code: 'DELETE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Sage Materials] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
