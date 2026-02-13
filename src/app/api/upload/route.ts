import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToR2, validateFile } from '@/lib/r2';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Pro status (file uploads require Pro)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPro: true },
    });

    if (!user?.isPro) {
      return NextResponse.json(
        { error: 'File uploads require a Pro subscription' },
        { status: 403 }
      );
    }

    // Check rate limit (10 uploads per hour per user)
    const rateLimit = await checkRateLimit('upload', session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const itemType = formData.get('itemType') as 'file' | 'image' | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!itemType || !['file', 'image'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid item type. Must be "file" or "image"' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(
      { name: file.name, size: file.size, type: file.type },
      itemType
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Convert to buffer and upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileUrl } = await uploadToR2(
      buffer,
      file.name,
      file.type,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred during upload' },
      { status: 500 }
    );
  }
}
