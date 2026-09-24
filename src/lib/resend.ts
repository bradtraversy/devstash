import { Resend } from 'resend'

let client: Resend | null = null

// Created on first use so a missing key fails the request that sends mail, not the build.
export function getResend(): Resend {
  if (client) return client
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  client = new Resend(apiKey)
  return client
}
