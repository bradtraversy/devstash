import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Session } from 'next-auth'

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Mock the openai module
vi.mock('@/lib/openai', () => ({
  AI_MODEL: 'gpt-5-nano',
  getOpenAIClient: vi.fn(),
}))

// Mock the rate-limit module
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  formatRetryTime: vi.fn((s: number) => `${s} seconds`),
}))

import { generateAutoTags, generateDescription, explainCode, optimizePrompt } from './ai'
import { auth } from '@/auth'
import { getOpenAIClient } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>
const mockGetOpenAIClient = vi.mocked(getOpenAIClient)
const mockCheckRateLimit = vi.mocked(checkRateLimit)

const validInput = {
  title: 'useAuth React Hook',
  content: 'const useAuth = () => { return useContext(AuthContext); }',
  language: 'typescript',
  typeName: 'snippet',
}

describe('generateAutoTags server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: rate limit passes
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: 0,
      retryAfter: 0,
    })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when user is not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    })

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI features require a Pro subscription')
  })

  it('returns error when validation fails (empty title)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const result = await generateAutoTags({ ...validInput, title: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('returns error when rate limited', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
    })

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many AI requests')
    expect(mockCheckRateLimit).toHaveBeenCalledWith('ai', 'user-123')
  })

  it('returns tags on success with { tags: [...] } format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ tags: ['react', 'hooks', 'auth', 'context'] }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(['react', 'hooks', 'auth', 'context'])
  })

  it('handles array format response', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify(['React', 'Hooks', 'Auth']),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(['react', 'hooks', 'auth'])
  })

  it('normalizes tags to lowercase and dedupes', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ tags: ['React', 'REACT', 'hooks', 'Hooks'] }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(['react', 'hooks'])
  })

  it('limits tags to 5', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(5)
  })

  it('returns error when AI returns empty response', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: '',
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI returned an empty response')
  })

  it('returns error when AI returns unexpected format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ result: 'not tags' }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI returned an unexpected format')
  })

  it('returns error when OpenAI API throws', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockRejectedValue(new Error('API error')),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags(validInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to generate tags. Please try again.')
  })

  it('truncates content to 2000 chars', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const longContent = 'a'.repeat(5000)
    const mockCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ tags: ['test'] }),
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    await generateAutoTags({ ...validInput, content: longContent })

    const callInput = mockCreate.mock.calls[0][0].input as string
    // Content portion should be truncated - the full input includes type/title/language prefix
    expect(callInput).toContain('a'.repeat(2000))
    expect(callInput).not.toContain('a'.repeat(2001))
  })

  it('works without content (title-only)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ tags: ['react'] }),
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateAutoTags({
      title: 'React Patterns',
      content: null,
      language: null,
      typeName: 'note',
    })

    expect(result.success).toBe(true)
    const callInput = mockCreate.mock.calls[0][0].input as string
    expect(callInput).not.toContain('Content:')
    expect(callInput).not.toContain('Language:')
  })
})

// ============================================
// generateDescription tests
// ============================================

const validDescInput = {
  title: 'useAuth React Hook',
  content: 'const useAuth = () => { return useContext(AuthContext); }',
  url: null,
  language: 'typescript',
  typeName: 'snippet',
}

describe('generateDescription server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: 0,
      retryAfter: 0,
    })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when user is not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    })

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI features require a Pro subscription')
  })

  it('returns error when validation fails (empty title)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const result = await generateDescription({ ...validDescInput, title: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('returns error when rate limited', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
    })

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many AI requests')
    expect(mockCheckRateLimit).toHaveBeenCalledWith('ai', 'user-123')
  })

  it('returns description on success with { description: "..." } format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ description: 'A custom React hook that provides authentication context access.' }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(true)
    expect(result.data).toBe('A custom React hook that provides authentication context access.')
  })

  it('handles plain string response', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify('A hook for auth context.'),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(true)
    expect(result.data).toBe('A hook for auth context.')
  })

  it('returns error when AI returns empty response', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: '' }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI returned an empty response')
  })

  it('returns error when AI returns unexpected format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ result: 123 }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI returned an unexpected format')
  })

  it('returns error when OpenAI API throws', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockRejectedValue(new Error('API error')),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateDescription(validDescInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to generate description. Please try again.')
  })

  it('truncates content to 2000 chars', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const longContent = 'a'.repeat(5000)
    const mockCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ description: 'A test item.' }),
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    await generateDescription({ ...validDescInput, content: longContent })

    const callInput = mockCreate.mock.calls[0][0].input as string
    expect(callInput).toContain('a'.repeat(2000))
    expect(callInput).not.toContain('a'.repeat(2001))
  })

  it('includes URL in context for link types', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ description: 'A useful documentation link.' }),
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    await generateDescription({
      title: 'React Docs',
      content: null,
      url: 'https://react.dev',
      language: null,
      typeName: 'link',
    })

    const callInput = mockCreate.mock.calls[0][0].input as string
    expect(callInput).toContain('URL: https://react.dev')
  })

  it('works without content (title-only)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ description: 'A collection of React patterns.' }),
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await generateDescription({
      title: 'React Patterns',
      content: null,
      url: null,
      language: null,
      typeName: 'note',
    })

    expect(result.success).toBe(true)
    const callInput = mockCreate.mock.calls[0][0].input as string
    expect(callInput).not.toContain('Content:')
    expect(callInput).not.toContain('Language:')
    expect(callInput).not.toContain('URL:')
  })
})

// ============================================
// explainCode tests
// ============================================

const validExplainInput = {
  title: 'useAuth React Hook',
  content: 'const useAuth = () => { return useContext(AuthContext); }',
  language: 'typescript',
  typeName: 'snippet' as const,
}

describe('explainCode server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: 0,
      retryAfter: 0,
    })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await explainCode(validExplainInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when user is not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    })

    const result = await explainCode(validExplainInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI features require a Pro subscription')
  })

  it('returns error when validation fails (empty title)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const result = await explainCode({ ...validExplainInput, title: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('returns error when validation fails (empty content)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const result = await explainCode({ ...validExplainInput, content: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('returns error when validation fails (invalid typeName)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const result = await explainCode({
      ...validExplainInput,
      typeName: 'note' as 'snippet',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('returns error when rate limited', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
    })

    const result = await explainCode(validExplainInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many AI requests')
    expect(mockCheckRateLimit).toHaveBeenCalledWith('ai', 'user-123')
  })

  it('returns explanation on success', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: '## Explanation\n\nThis hook provides access to the auth context.',
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await explainCode(validExplainInput)

    expect(result.success).toBe(true)
    expect(result.data).toBe('## Explanation\n\nThis hook provides access to the auth context.')
  })

  it('returns error when AI returns empty response', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: '' }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await explainCode(validExplainInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI returned an empty response')
  })

  it('returns error when OpenAI API throws', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockRejectedValue(new Error('API error')),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await explainCode(validExplainInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to explain code. Please try again.')
  })

  it('truncates content to 2000 chars', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const longContent = 'a'.repeat(5000)
    const mockCreate = vi.fn().mockResolvedValue({
      output_text: 'This code repeats the letter a many times.',
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    await explainCode({ ...validExplainInput, content: longContent })

    const callInput = mockCreate.mock.calls[0][0].input as string
    expect(callInput).toContain('a'.repeat(2000))
    expect(callInput).not.toContain('a'.repeat(2001))
  })

  it('works for command type', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockCreate = vi.fn().mockResolvedValue({
      output_text: 'This command lists files.',
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await explainCode({
      title: 'List files',
      content: 'ls -la',
      language: 'bash',
      typeName: 'command',
    })

    expect(result.success).toBe(true)
    const callInput = mockCreate.mock.calls[0][0].input as string
    expect(callInput).toContain('Type: command')
    expect(callInput).toContain('Language: bash')
  })

  it('does not request JSON format (returns plain markdown)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockCreate = vi.fn().mockResolvedValue({
      output_text: '# Explanation\n\nSome markdown.',
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    await explainCode(validExplainInput)

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.text).toBeUndefined()
  })
})

// ============================================
// optimizePrompt tests
// ============================================

const validOptimizeInput = {
  title: 'Code Review Prompt',
  content: 'Review this code and tell me if there are any bugs.',
}

describe('optimizePrompt server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: 0,
      retryAfter: 0,
    })
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('returns error when user is not Pro', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    })

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI features require a Pro subscription')
  })

  it('returns error when validation fails (empty title)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const result = await optimizePrompt({ ...validOptimizeInput, title: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('returns error when validation fails (empty content)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const result = await optimizePrompt({ ...validOptimizeInput, content: '' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })

  it('returns error when rate limited', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
    })

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many AI requests')
    expect(mockCheckRateLimit).toHaveBeenCalledWith('ai', 'user-123')
  })

  it('returns optimized prompt on success with { optimizedPrompt: "..." } format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ optimizedPrompt: 'Please review the following code for potential bugs, security vulnerabilities, and performance issues. Provide specific line references and suggested fixes.' }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(true)
    expect(result.data).toBe('Please review the following code for potential bugs, security vulnerabilities, and performance issues. Provide specific line references and suggested fixes.')
  })

  it('handles plain string response', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify('An improved prompt text.'),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(true)
    expect(result.data).toBe('An improved prompt text.')
  })

  it('returns error when AI returns empty response', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: '' }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI returned an empty response')
  })

  it('returns error when AI returns unexpected format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({ result: 123 }),
        }),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('AI returned an unexpected format')
  })

  it('returns error when OpenAI API throws', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockClient = {
      responses: {
        create: vi.fn().mockRejectedValue(new Error('API error')),
      },
    }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    const result = await optimizePrompt(validOptimizeInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to optimize prompt. Please try again.')
  })

  it('truncates content to 2000 chars', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const longContent = 'a'.repeat(5000)
    const mockCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ optimizedPrompt: 'Optimized version.' }),
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    await optimizePrompt({ ...validOptimizeInput, content: longContent })

    const callInput = mockCreate.mock.calls[0][0].input as string
    expect(callInput).toContain('a'.repeat(2000))
    expect(callInput).not.toContain('a'.repeat(2001))
  })

  it('requests JSON format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    })

    const mockCreate = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({ optimizedPrompt: 'Better prompt.' }),
    })
    const mockClient = { responses: { create: mockCreate } }
    mockGetOpenAIClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getOpenAIClient>)

    await optimizePrompt(validOptimizeInput)

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.text).toEqual({ format: { type: 'json_object' } })
  })
})
