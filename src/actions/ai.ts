'use server'

import { z } from 'zod'
import { auth } from '@/auth'
import { getOpenAIClient, AI_MODEL } from '@/lib/openai'
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit'

const MAX_CONTENT_LENGTH = 2000

const generateAutoTagsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  typeName: z.string().min(1, 'Type is required'),
})

export type GenerateAutoTagsInput = z.infer<typeof generateAutoTagsSchema>

interface GenerateAutoTagsResult {
  success: boolean
  data?: string[]
  error?: string
}

export async function generateAutoTags(
  input: GenerateAutoTagsInput
): Promise<GenerateAutoTagsResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Pro gating
  const isPro = session.user.isPro ?? false
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' }
  }

  const parsed = generateAutoTagsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  // Rate limiting
  const rateLimit = await checkRateLimit('ai', session.user.id)
  if (!rateLimit.success) {
    const retryTime = formatRetryTime(rateLimit.retryAfter)
    return {
      success: false,
      error: `Too many AI requests. Please try again in ${retryTime}.`,
    }
  }

  const { title, content, language, typeName } = parsed.data

  // Build context for the AI
  const truncatedContent = content
    ? content.slice(0, MAX_CONTENT_LENGTH)
    : null

  const contextParts = [
    `Type: ${typeName}`,
    `Title: ${title}`,
    language ? `Language: ${language}` : null,
    truncatedContent ? `Content:\n${truncatedContent}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = getOpenAIClient()

    const response = await client.responses.create({
      model: AI_MODEL,
      instructions:
        'You are a developer tool assistant that suggests relevant tags for code snippets, prompts, commands, notes, and links. Return a JSON object with a "tags" key containing an array of 3-5 short, lowercase tag strings. Tags should be specific and useful for categorization. Only return valid JSON.',
      input: `Suggest 3-5 tags for this developer item. Respond in json format with a "tags" array.\n\n${contextParts}`,
      text: {
        format: { type: 'json_object' },
      },
    })

    const text = response.output_text
    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    const parsed_response = JSON.parse(text)

    // Handle both { tags: [...] } and [...] formats
    let tags: unknown[]
    if (Array.isArray(parsed_response)) {
      tags = parsed_response
    } else if (parsed_response.tags && Array.isArray(parsed_response.tags)) {
      tags = parsed_response.tags
    } else {
      return { success: false, error: 'AI returned an unexpected format' }
    }

    // Normalize: filter to strings, lowercase, dedupe, limit to 5
    const normalizedTags = [...new Set(
      tags
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toLowerCase())
    )].slice(0, 5)

    if (normalizedTags.length === 0) {
      return { success: false, error: 'AI could not generate tags for this item' }
    }

    return { success: true, data: normalizedTags }
  } catch (error) {
    console.error('AI tag generation failed:', error)
    return { success: false, error: 'Failed to generate tags. Please try again.' }
  }
}

// ============================================
// Generate Description
// ============================================

const generateDescriptionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  typeName: z.string().min(1, 'Type is required'),
})

export type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>

interface GenerateDescriptionResult {
  success: boolean
  data?: string
  error?: string
}

export async function generateDescription(
  input: GenerateDescriptionInput
): Promise<GenerateDescriptionResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Pro gating
  const isPro = session.user.isPro ?? false
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' }
  }

  const parsed = generateDescriptionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  // Rate limiting
  const rateLimit = await checkRateLimit('ai', session.user.id)
  if (!rateLimit.success) {
    const retryTime = formatRetryTime(rateLimit.retryAfter)
    return {
      success: false,
      error: `Too many AI requests. Please try again in ${retryTime}.`,
    }
  }

  const { title, content, url, language, typeName } = parsed.data

  // Build context for the AI
  const truncatedContent = content
    ? content.slice(0, MAX_CONTENT_LENGTH)
    : null

  const contextParts = [
    `Type: ${typeName}`,
    `Title: ${title}`,
    language ? `Language: ${language}` : null,
    url ? `URL: ${url}` : null,
    truncatedContent ? `Content:\n${truncatedContent}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = getOpenAIClient()

    const response = await client.responses.create({
      model: AI_MODEL,
      instructions:
        'You are a developer tool assistant that writes concise descriptions for code snippets, prompts, commands, notes, and links. Return a JSON object with a "description" key containing a 1-2 sentence description. The description should be clear, informative, and summarize what the item is or does. Only return valid JSON.',
      input: `Write a concise 1-2 sentence description for this developer item. Respond in json format with a "description" string.\n\n${contextParts}`,
      text: {
        format: { type: 'json_object' },
      },
    })

    const text = response.output_text
    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    const parsed_response = JSON.parse(text)

    // Handle both { description: "..." } and plain string
    let description: string
    if (typeof parsed_response === 'string') {
      description = parsed_response
    } else if (parsed_response.description && typeof parsed_response.description === 'string') {
      description = parsed_response.description
    } else {
      return { success: false, error: 'AI returned an unexpected format' }
    }

    const trimmed = description.trim()
    if (trimmed.length === 0) {
      return { success: false, error: 'AI could not generate a description for this item' }
    }

    return { success: true, data: trimmed }
  } catch (error) {
    console.error('AI description generation failed:', error)
    return { success: false, error: 'Failed to generate description. Please try again.' }
  }
}

// ============================================
// Explain Code
// ============================================

const explainCodeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  language: z.string().nullable().optional(),
  typeName: z.enum(['snippet', 'command']),
})

export type ExplainCodeInput = z.infer<typeof explainCodeSchema>

interface ExplainCodeResult {
  success: boolean
  data?: string
  error?: string
}

// ============================================
// Optimize Prompt
// ============================================

const optimizePromptSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
})

export type OptimizePromptInput = z.infer<typeof optimizePromptSchema>

interface OptimizePromptResult {
  success: boolean
  data?: string
  error?: string
}

export async function optimizePrompt(
  input: OptimizePromptInput
): Promise<OptimizePromptResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Pro gating
  const isPro = session.user.isPro ?? false
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' }
  }

  const parsed = optimizePromptSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  // Rate limiting
  const rateLimit = await checkRateLimit('ai', session.user.id)
  if (!rateLimit.success) {
    const retryTime = formatRetryTime(rateLimit.retryAfter)
    return {
      success: false,
      error: `Too many AI requests. Please try again in ${retryTime}.`,
    }
  }

  const { title, content } = parsed.data

  // Build context for the AI
  const truncatedContent = content.slice(0, MAX_CONTENT_LENGTH)

  const contextParts = [
    `Title: ${title}`,
    `Prompt:\n${truncatedContent}`,
  ].join('\n')

  try {
    const client = getOpenAIClient()

    const response = await client.responses.create({
      model: AI_MODEL,
      instructions:
        'You are a prompt engineering expert. Analyze the following prompt and return an improved version. Make it clearer, more specific, and more effective while preserving the original intent. Return a JSON object with an "optimizedPrompt" key containing the improved prompt text. Only return valid JSON.',
      input: `Optimize the following prompt. Return a JSON object with an "optimizedPrompt" key.\n\n${contextParts}`,
      text: {
        format: { type: 'json_object' },
      },
    })

    const text = response.output_text
    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    const parsed_response = JSON.parse(text)

    // Handle both { optimizedPrompt: "..." } and plain string
    let optimized: string
    if (typeof parsed_response === 'string') {
      optimized = parsed_response
    } else if (parsed_response.optimizedPrompt && typeof parsed_response.optimizedPrompt === 'string') {
      optimized = parsed_response.optimizedPrompt
    } else {
      return { success: false, error: 'AI returned an unexpected format' }
    }

    const trimmed = optimized.trim()
    if (trimmed.length === 0) {
      return { success: false, error: 'AI could not optimize this prompt' }
    }

    return { success: true, data: trimmed }
  } catch (error) {
    console.error('AI prompt optimization failed:', error)
    return { success: false, error: 'Failed to optimize prompt. Please try again.' }
  }
}

export async function explainCode(
  input: ExplainCodeInput
): Promise<ExplainCodeResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Pro gating
  const isPro = session.user.isPro ?? false
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' }
  }

  const parsed = explainCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  // Rate limiting
  const rateLimit = await checkRateLimit('ai', session.user.id)
  if (!rateLimit.success) {
    const retryTime = formatRetryTime(rateLimit.retryAfter)
    return {
      success: false,
      error: `Too many AI requests. Please try again in ${retryTime}.`,
    }
  }

  const { title, content, language, typeName } = parsed.data

  // Build context for the AI
  const truncatedContent = content.slice(0, MAX_CONTENT_LENGTH)

  const contextParts = [
    `Type: ${typeName}`,
    `Title: ${title}`,
    language ? `Language: ${language}` : null,
    `Code:\n${truncatedContent}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = getOpenAIClient()

    const response = await client.responses.create({
      model: AI_MODEL,
      instructions:
        'You are a developer tool assistant that explains code snippets and terminal commands. Provide a clear, concise explanation (200-300 words) in markdown format. Cover what the code does, key concepts used, and any important details. Use markdown headings, bullet points, and inline code formatting where appropriate. Return plain markdown text, NOT JSON.',
      input: `Explain the following code. Provide a concise explanation in markdown format.\n\n${contextParts}`,
    })

    const text = response.output_text
    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    const trimmed = text.trim()
    if (trimmed.length === 0) {
      return { success: false, error: 'AI could not generate an explanation for this code' }
    }

    return { success: true, data: trimmed }
  } catch (error) {
    console.error('AI code explanation failed:', error)
    return { success: false, error: 'Failed to explain code. Please try again.' }
  }
}
