// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Reconstruct service account from environment variables for Vercel/serverless
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

function isServiceAccountValid(sa: any) {
  return sa && typeof sa.project_id === 'string' && sa.project_id.length > 0 && typeof sa.client_email === 'string' && sa.client_email.length > 0 && typeof sa.private_key === 'string' && sa.private_key.length > 0;
}

// Remove undefined keys from serviceAccount
function cleanServiceAccount(sa: any) {
  const cleaned: any = {};
  for (const key in sa) {
    if (sa[key] !== undefined) {
      cleaned[key] = sa[key];
    }
  }
  return cleaned;
}

// Initialize Firebase Admin if not already done and credentials are valid
if (!getApps().length) {
  if (isServiceAccountValid(serviceAccount)) {
    initializeApp({
      credential: cert(cleanServiceAccount(serviceAccount)),
      storageBucket: 'gs://shiftwise-6d8b0.firebasestorage.app',
    });
  } else {
    console.error('[Firebase Admin] Service account credentials are missing or invalid. Please set the required environment variables.');
  }
}

// This ensures Next treats it as a dynamic, server-only route
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    if (!isServiceAccountValid(serviceAccount)) {
      return NextResponse.json(
        { error: 'Firebase Admin credentials are missing or invalid. Please set the required environment variables.' },
        { status: 500 }
      );
    }

    console.log('🔌 [upload] route hit');

    // Parse the incoming multipart/form-data
    const formData = await req.formData();
    console.log('📦 formData keys:', Array.from(formData.keys()));

    const fileBlob = formData.get('file');
    if (!(fileBlob instanceof Blob)) {
      console.error('⚠️ [upload] no file blob found:', fileBlob);
      return NextResponse.json(
        { error: 'No file provided under field "file"' },
        { status: 400 }
      );
    }

    // Extract filename & type
    const filename = (fileBlob as any).name || `unknown`;
    const contentType = (fileBlob as any).type || 'application/octet-stream';
    console.log('🖼️ [upload] file:', filename, contentType);

    // Convert Blob to Node Buffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare Cloud Storage
    const bucket = getStorage().bucket();
    const remotePath = `issues/${Date.now()}_${filename}`;
    const gcsFile = bucket.file(remotePath);

    // Upload
    await gcsFile.save(buffer, {
      metadata: { contentType },
      public: true,       // optional: world-readable
      validation: 'md5',  // ensure integrity
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${remotePath}`;
    console.log('✅ [upload] success:', publicUrl);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('💥 [upload] error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown server error' },
      { status: 500 }
    );
  }
}
