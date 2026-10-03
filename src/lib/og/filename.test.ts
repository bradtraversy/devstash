import { describe, it, expect } from 'vitest';
import { imageFilename } from './filename';

describe('imageFilename', () => {
  it('slugifies the title', () => {
    expect(imageFilename('useAuth Hook')).toBe('useauth-hook.png');
    expect(imageFilename('Docker Compose - Node.js + PostgreSQL')).toBe('docker-compose-node-js-postgresql.png');
  });

  it('falls back when nothing survives', () => {
    expect(imageFilename('***')).toBe('snippet.png');
    expect(imageFilename('')).toBe('snippet.png');
  });
});
