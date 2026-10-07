import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generateApiToken, hashApiToken, parseBearerToken } from './tokens';

const TOKEN = `ds_${'a'.repeat(20)}-_${'Z9'.repeat(10)}0`;

describe('generateApiToken', () => {
  it('makes a ds_ token of 43 base64url characters', () => {
    const { token } = generateApiToken();

    expect(token).toMatch(/^ds_[A-Za-z0-9_-]{43}$/);
    expect(token).toHaveLength(46);
  });

  it('makes a different token every time', () => {
    expect(generateApiToken().token).not.toBe(generateApiToken().token);
  });

  it('returns the SHA-256 hex of the token and its last four characters', () => {
    const { token, tokenHash, lastFour } = generateApiToken();

    expect(tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(hashApiToken(token));
    expect(lastFour).toBe(token.slice(-4));
    expect(lastFour).toHaveLength(4);
  });
});

describe('hashApiToken', () => {
  it('is stable for the same token and differs between tokens', () => {
    expect(hashApiToken(TOKEN)).toBe(hashApiToken(TOKEN));
    expect(hashApiToken(TOKEN)).not.toBe(hashApiToken(`${TOKEN.slice(0, -1)}1`));
  });
});

describe('parseBearerToken', () => {
  it('fixture is a well-formed token', () => {
    expect(TOKEN).toMatch(/^ds_[A-Za-z0-9_-]{43}$/);
  });

  it('returns the token from a Bearer header', () => {
    expect(parseBearerToken(`Bearer ${TOKEN}`)).toBe(TOKEN);
  });

  it('accepts the scheme in any case and surrounding whitespace', () => {
    expect(parseBearerToken(`bearer ${TOKEN}`)).toBe(TOKEN);
    expect(parseBearerToken(`BEARER ${TOKEN}`)).toBe(TOKEN);
    expect(parseBearerToken(`  Bearer   ${TOKEN}  `)).toBe(TOKEN);
  });

  it('rejects a missing header or scheme', () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken('')).toBeNull();
    expect(parseBearerToken(TOKEN)).toBeNull();
    expect(parseBearerToken('Bearer')).toBeNull();
    expect(parseBearerToken('Bearer ')).toBeNull();
  });

  it('rejects other schemes', () => {
    expect(parseBearerToken(`Basic ${TOKEN}`)).toBeNull();
    expect(parseBearerToken(`Token ${TOKEN}`)).toBeNull();
  });

  it('rejects a wrong prefix', () => {
    const body = TOKEN.slice(3);
    expect(parseBearerToken(`Bearer gh_${body}`)).toBeNull();
    expect(parseBearerToken(`Bearer DS_${body}`)).toBeNull();
    expect(parseBearerToken(`Bearer ${body}`)).toBeNull();
  });

  it('rejects a wrong length', () => {
    expect(parseBearerToken(`Bearer ${TOKEN.slice(0, -1)}`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN}a`)).toBeNull();
  });

  it('rejects characters outside base64url', () => {
    expect(parseBearerToken(`Bearer ${TOKEN.slice(0, -1)}+`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN.slice(0, -1)}=`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN.slice(0, -1)}/`)).toBeNull();
  });

  it('rejects extra parts', () => {
    expect(parseBearerToken(`Bearer ${TOKEN} extra`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN} ${TOKEN}`)).toBeNull();
    expect(parseBearerToken(`Bearer Bearer ${TOKEN}`)).toBeNull();
  });
});
