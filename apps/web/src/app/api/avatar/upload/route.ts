/**
 * API Route: Image Upload
 * Handles uploading images to Supabase Storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `public/${fileName}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
