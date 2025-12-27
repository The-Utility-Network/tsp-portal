import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { writeFile } from 'fs/promises';
import path from 'path';

// Initialize Google Cloud Storage
let storage: Storage | null = null;
let bucket: any = null;

try {
  // Check if Google Cloud is configured
  if (process.env.GOOGLE_CLOUD_PROJECT_ID && (process.env.GOOGLE_CLOUD_KEY_FILE || process.env.GOOGLE_CLOUD_CREDENTIALS)) {
    const storageConfig: any = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    };

    if (process.env.GOOGLE_CLOUD_KEY_FILE) {
      storageConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
    } else if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      storageConfig.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    }

    storage = new Storage(storageConfig);
    bucket = storage.bucket('tgl_cdn');
  }
} catch (error) {
  console.error('Google Cloud Storage initialization failed:', error);
  storage = null;
  bucket = null;
}

export async function POST(request: NextRequest) {
  try {
    // Check if Google Cloud is configured
    if (!storage || !bucket) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Image upload service not configured. Please contact administrator to set up Google Cloud Storage.' 
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `signature-images/${timestamp}-${originalName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Google Cloud Storage
    const gcsFile = bucket.file(fileName);
    await gcsFile.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Try to make the file public, but handle uniform bucket-level access gracefully
    try {
      await gcsFile.makePublic();
    } catch (makePublicError: any) {
      // If uniform bucket-level access is enabled, this will fail
      // Log the warning but continue - the file is uploaded successfully
      console.warn('Could not make file public (likely due to uniform bucket-level access):', makePublicError.message);
      // This is okay if bucket has public read permissions configured at bucket level
    }
    
    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/tgl_cdn/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: fileName,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
} 