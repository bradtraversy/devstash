import Stripe from 'stripe'

let client: Stripe | null = null

// Created on first use so a missing secret fails the request that needs it, not the build.
export function getStripe(): Stripe {
  if (client) return client
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }
  client = new Stripe(apiKey, { typescript: true })
  return client
}
