const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: 'This email already has a DevStash account. Sign in the way you did before.',
  OAuthEmailUnverified:
    'That account has no verified email address. Verify it with the provider, or sign in another way.',
}

/** Message for the `error` query param Auth.js adds to the sign-in page. */
export function oauthErrorMessage(error: string | null): string | null {
  if (!error) return null
  return OAUTH_ERRORS[error] ?? 'An error occurred. Please try again.'
}

const PROVIDER_LABELS: Record<string, string> = { github: 'GitHub', google: 'Google' }

export function describeSignInMethods(hasPassword: boolean, providers: string[]): string {
  const methods = Object.keys(PROVIDER_LABELS)
    .filter((provider) => providers.includes(provider))
    .map((provider) => PROVIDER_LABELS[provider])
  if (hasPassword) methods.push('email and password')

  if (methods.length === 0) return 'Email account'
  if (methods.length === 1) return `Signs in with ${methods[0]}`
  return `Signs in with ${methods.slice(0, -1).join(', ')}${methods.length > 2 ? ',' : ''} or ${methods.at(-1)}`
}
