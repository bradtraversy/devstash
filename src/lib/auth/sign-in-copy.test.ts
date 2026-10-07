import { describe, it, expect } from 'vitest'
import { describeSignInMethods, oauthErrorMessage } from './sign-in-copy'

describe('oauthErrorMessage', () => {
  it('returns nothing without an error', () => {
    expect(oauthErrorMessage(null)).toBeNull()
    expect(oauthErrorMessage('')).toBeNull()
  })

  it('does not assume the existing account has a password', () => {
    const message = oauthErrorMessage('OAuthAccountNotLinked')
    expect(message).toBe('This email already has a DevStash account. Sign in the way you did before.')
    expect(message).not.toMatch(/password/i)
  })

  it('explains an unverified provider email', () => {
    expect(oauthErrorMessage('OAuthEmailUnverified')).toMatch(/no verified email/)
  })

  it('falls back to a generic message', () => {
    expect(oauthErrorMessage('Configuration')).toBe('An error occurred. Please try again.')
  })
})

describe('describeSignInMethods', () => {
  it('names a single method', () => {
    expect(describeSignInMethods(false, ['github'])).toBe('Signs in with GitHub')
    expect(describeSignInMethods(false, ['google'])).toBe('Signs in with Google')
    expect(describeSignInMethods(true, [])).toBe('Signs in with email and password')
  })

  it('joins two or three methods in a fixed order', () => {
    expect(describeSignInMethods(false, ['google', 'github'])).toBe('Signs in with GitHub or Google')
    expect(describeSignInMethods(true, ['google'])).toBe('Signs in with Google or email and password')
    expect(describeSignInMethods(true, ['google', 'github'])).toBe(
      'Signs in with GitHub, Google, or email and password'
    )
  })

  it('ignores unknown providers and falls back when nothing is set', () => {
    expect(describeSignInMethods(false, ['gitlab'])).toBe('Email account')
  })
})
