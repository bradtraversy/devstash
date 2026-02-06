import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await params;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!publicUrl) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    // Reconstruct the full path
    const filePath = path.join('/');

    // Verify the file belongs to the current user (path starts with userId)
    if (!filePath.startsWith(session.user.id + '/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch from R2
    const fileUrl = `${publicUrl}/${filePath}`;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get the file data
    const data = await response.arrayBuffer();
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';

    // Extract filename from path
    const fileName = filePath.split('/').pop() || 'download';
    // Remove timestamp prefix if present (format: timestamp-filename)
    const cleanFileName = fileName.replace(/^\d+-/, '');

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'An error occurred during download' },
      { status: 500 }
    );
  }
}
