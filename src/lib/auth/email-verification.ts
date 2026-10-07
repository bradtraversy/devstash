/** Development only: in production every account proves its email, which Google relies on when it links by email. */
export function skipsEmailVerification(): boolean {
  return process.env.SKIP_EMAIL_VERIFICATION === 'true' && process.env.NODE_ENV !== 'production'
}
