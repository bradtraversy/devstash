import { describe, it, expect } from 'vitest';
import { validateFile, formatFileSize, FILE_CONSTRAINTS } from './r2';

describe('validateFile', () => {
  describe('image validation', () => {
    it('accepts valid PNG image within size limit', () => {
      const result = validateFile(
        { name: 'photo.png', size: 1024 * 1024, type: 'image/png' },
        'image'
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts valid JPEG image', () => {
      const result = validateFile(
        { name: 'photo.jpg', size: 1024, type: 'image/jpeg' },
        'image'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts valid WebP image', () => {
      const result = validateFile(
        { name: 'photo.webp', size: 1024, type: 'image/webp' },
        'image'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts valid SVG image', () => {
      const result = validateFile(
        { name: 'icon.svg', size: 1024, type: 'image/svg+xml' },
        'image'
      );
      expect(result.valid).toBe(true);
    });

    it('rejects image exceeding size limit', () => {
      const result = validateFile(
        { name: 'large.png', size: 6 * 1024 * 1024, type: 'image/png' },
        'image'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 MB');
    });

    it('rejects invalid image extension', () => {
      const result = validateFile(
        { name: 'document.pdf', size: 1024, type: 'application/pdf' },
        'image'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('rejects invalid MIME type for image', () => {
      const result = validateFile(
        { name: 'fake.png', size: 1024, type: 'application/pdf' },
        'image'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid MIME type');
    });
  });

  describe('file validation', () => {
    it('accepts valid PDF file within size limit', () => {
      const result = validateFile(
        { name: 'document.pdf', size: 5 * 1024 * 1024, type: 'application/pdf' },
        'file'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts valid JSON file', () => {
      const result = validateFile(
        { name: 'data.json', size: 1024, type: 'application/json' },
        'file'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts valid Markdown file', () => {
      const result = validateFile(
        { name: 'readme.md', size: 1024, type: 'text/markdown' },
        'file'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts valid YAML file', () => {
      const result = validateFile(
        { name: 'config.yaml', size: 1024, type: 'application/x-yaml' },
        'file'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts valid CSV file', () => {
      const result = validateFile(
        { name: 'data.csv', size: 1024, type: 'text/csv' },
        'file'
      );
      expect(result.valid).toBe(true);
    });

    it('rejects file exceeding size limit', () => {
      const result = validateFile(
        { name: 'large.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' },
        'file'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10 MB');
    });

    it('rejects invalid file extension', () => {
      const result = validateFile(
        { name: 'script.js', size: 1024, type: 'text/javascript' },
        'file'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('rejects image types for file upload', () => {
      const result = validateFile(
        { name: 'photo.png', size: 1024, type: 'image/png' },
        'file'
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles case-insensitive extensions', () => {
      const result = validateFile(
        { name: 'PHOTO.PNG', size: 1024, type: 'image/png' },
        'image'
      );
      expect(result.valid).toBe(true);
    });

    it('handles files with multiple dots', () => {
      const result = validateFile(
        { name: 'my.file.name.pdf', size: 1024, type: 'application/pdf' },
        'file'
      );
      expect(result.valid).toBe(true);
    });

    it('rejects files at exactly the size limit', () => {
      // 5MB + 1 byte should fail for images
      const result = validateFile(
        { name: 'photo.png', size: FILE_CONSTRAINTS.image.maxSize + 1, type: 'image/png' },
        'image'
      );
      expect(result.valid).toBe(false);
    });

    it('accepts files exactly at size limit', () => {
      const result = validateFile(
        { name: 'photo.png', size: FILE_CONSTRAINTS.image.maxSize, type: 'image/png' },
        'image'
      );
      expect(result.valid).toBe(true);
    });
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(10 * 1024)).toBe('10 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });
});

describe('FILE_CONSTRAINTS', () => {
  it('has correct image constraints', () => {
    expect(FILE_CONSTRAINTS.image.maxSize).toBe(5 * 1024 * 1024);
    expect(FILE_CONSTRAINTS.image.extensions).toContain('.png');
    expect(FILE_CONSTRAINTS.image.extensions).toContain('.jpg');
    expect(FILE_CONSTRAINTS.image.extensions).toContain('.jpeg');
    expect(FILE_CONSTRAINTS.image.extensions).toContain('.gif');
    expect(FILE_CONSTRAINTS.image.extensions).toContain('.webp');
    expect(FILE_CONSTRAINTS.image.extensions).toContain('.svg');
    expect(FILE_CONSTRAINTS.image.mimeTypes).toContain('image/png');
    expect(FILE_CONSTRAINTS.image.mimeTypes).toContain('image/jpeg');
  });

  it('has correct file constraints', () => {
    expect(FILE_CONSTRAINTS.file.maxSize).toBe(10 * 1024 * 1024);
    expect(FILE_CONSTRAINTS.file.extensions).toContain('.pdf');
    expect(FILE_CONSTRAINTS.file.extensions).toContain('.txt');
    expect(FILE_CONSTRAINTS.file.extensions).toContain('.md');
    expect(FILE_CONSTRAINTS.file.extensions).toContain('.json');
    expect(FILE_CONSTRAINTS.file.mimeTypes).toContain('application/pdf');
    expect(FILE_CONSTRAINTS.file.mimeTypes).toContain('text/plain');
  });
});
