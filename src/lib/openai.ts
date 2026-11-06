import OpenAI from 'openai'

export const AI_MODEL = 'gpt-5.6-luna'

let client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (client) return client

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  client = new OpenAI({ apiKey })
  return client
}
