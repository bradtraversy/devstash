import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// File constraints from spec
export const FILE_CONSTRAINTS = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
  },
  file: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    extensions: [
      '.pdf',
      '.txt',
      '.md',
      '.json',
      '.yaml',
      '.yml',
      '.xml',
      '.csv',
      '.toml',
      '.ini',
    ],
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/json',
      'application/x-yaml',
      'text/yaml',
      'application/xml',
      'text/xml',
      'text/csv',
      'application/toml',
    ],
  },
} as const;

// Initialize S3 client for R2
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Validate file based on item type (file or image)
 */
export function validateFile(
  file: { name: string; size: number; type: string },
  itemType: 'file' | 'image'
): { valid: boolean; error?: string } {
  const constraints = FILE_CONSTRAINTS[itemType];

  // Check file size
  if (file.size > constraints.maxSize) {
    const maxMB = constraints.maxSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxMB} MB limit` };
  }

  // Check extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!(constraints.extensions as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${constraints.extensions.join(', ')}`,
    };
  }

  // Check MIME type
  if (!(constraints.mimeTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid MIME type: ${file.type}`,
    };
  }

  return { valid: true };
}

/**
 * Upload file to R2
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  userId: string
): Promise<{ fileUrl: string; key: string }> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('R2 bucket configuration missing');
  }

  // Generate unique key with user namespace
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${userId}/${timestamp}-${sanitizedFileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  const fileUrl = `${publicUrl}/${key}`;
  return { fileUrl, key };
}

/**
 * Delete file from R2 by URL
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('R2 bucket configuration missing');
  }

  // Extract key from URL
  const key = fileUrl.replace(`${publicUrl}/`, '');

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
