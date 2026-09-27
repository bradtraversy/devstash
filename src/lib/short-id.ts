import { randomInt } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const SHORT_ID_LENGTH = 8;

export const SHORT_ID_PATTERN = /^[a-z0-9]{8}$/;

/** Random 8-character id over [a-z0-9]; uniqueness is enforced by the database. */
export function generateShortId(): string {
  let id = '';
  for (let i = 0; i < SHORT_ID_LENGTH; i++) {
    id += ALPHABET[randomInt(ALPHABET.length)];
  }
  return id;
}
