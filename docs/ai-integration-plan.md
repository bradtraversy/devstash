# AI Integration Plan

> Research findings for integrating OpenAI GPT-5 Nano into DevStash

---

## Table of Contents

- [Model Selection](#model-selection)
- [SDK Setup & Configuration](#sdk-setup--configuration)
- [AI Features Breakdown](#ai-features-breakdown)
- [Server Action Patterns](#server-action-patterns)
- [Streaming vs Non-Streaming](#streaming-vs-non-streaming)
- [Error Handling & Rate Limiting](#error-handling--rate-limiting)
- [Pro User Gating](#pro-user-gating)
- [Cost Optimization](#cost-optimization)
- [UI Patterns](#ui-patterns)
- [Security Considerations](#security-considerations)
- [Implementation Roadmap](#implementation-roadmap)

---

## Model Selection

### GPT-5 Nano

| Property | Value |
|---|---|
| **Model ID** | `gpt-5-nano` |
| **Input Cost** | $0.05 / 1M tokens |
| **Output Cost** | $0.40 / 1M tokens |
| **Strengths** | Ultra-low latency, cost-effective, good for classification/summarization |
| **Supports** | Structured outputs, function calling, streaming |
| **Context Window** | Suitable for code snippets and short content |

GPT-5 Nano is ideal for DevStash's AI features because:
- **Auto-tagging** = classification task (nano's sweet spot)
- **Summaries** = summarization task (nano's sweet spot)
- **Code explanation** = moderate reasoning (nano handles well for short snippets)
- **Prompt optimization** = rewriting task (nano handles well)

### Cost Estimates

Assuming average item content is ~500 tokens input, ~200 tokens output:

| Feature | Est. Input Tokens | Est. Output Tokens | Cost per Call |
|---|---|---|---|
| Auto-tag | ~600 | ~50 | ~$0.00005 |
| Summary | ~600 | ~150 | ~$0.00009 |
| Code Explanation | ~800 | ~300 | ~$0.00016 |
| Prompt Optimizer | ~500 | ~400 | ~$0.00019 |

At these rates, even 10,000 AI calls/month costs ~$1.50. Very sustainable.

---

## SDK Setup & Configuration

### Recommended: Vercel AI SDK + OpenAI Provider

Use the **Vercel AI SDK** (v5+) with the `@ai-sdk/openai` provider instead of the raw OpenAI SDK. Benefits:

- Native Next.js integration with server actions
- Built-in streaming support (`streamText`, `streamObject`)
- Structured output with Zod schemas (`generateObject`)
- Provider-agnostic (easy to swap models later)
- React hooks for client-side streaming (`useChat`, `useCompletion`)

### Installation

```bash
npm install ai @ai-sdk/openai
```

### Environment Variables

```env
# .env.local
OPENAI_API_KEY=sk-...
```

The `@ai-sdk/openai` provider reads `OPENAI_API_KEY` automatically.

### Provider Setup

```typescript
// src/lib/ai.ts

import { openai } from '@ai-sdk/openai';

// Model constants
export const AI_MODEL = openai('gpt-5-nano');

// Shared system prompts
export const SYSTEM_PROMPTS = {
  autoTag: `You are a developer tool assistant. Given a code snippet, command, prompt, note, or link, suggest relevant tags for categorization. Return only lowercase, hyphenated tags relevant to developers (e.g., "react-hooks", "git", "python", "api-design").`,

  summarize: `You are a developer tool assistant. Summarize the given content concisely in 1-2 sentences. Focus on what the content does or is about from a developer's perspective.`,

  explainCode: `You are a senior developer and educator. Explain the given code clearly and concisely. Cover what it does, key concepts used, and any important details. Use plain language suitable for intermediate developers.`,

  optimizePrompt: `You are an AI prompt engineering expert. Optimize the given prompt to be more effective. Improve clarity, add specificity, and structure it for better AI responses. Return only the optimized prompt text.`,
} as const;
```

---

## AI Features Breakdown

### 1. Auto-Tag Suggestions

**Purpose:** Suggest relevant tags when creating/editing an item.

**Approach:** Use `generateObject` with a Zod schema to get structured tag array.

```typescript
// src/actions/ai.ts
'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { AI_MODEL, SYSTEM_PROMPTS } from '@/lib/ai';
import { auth } from '@/auth';

const autoTagSchema = z.object({
  tags: z.array(z.string()).min(1).max(8).describe('Relevant developer tags'),
});

export async function suggestTags(input: {
  title: string;
  content: string;
  typeName: string;
}): Promise<{ success: boolean; data?: string[]; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const isPro = session.user.isPro ?? false;
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' };
  }

  try {
    const { object } = await generateObject({
      model: AI_MODEL,
      system: SYSTEM_PROMPTS.autoTag,
      prompt: `Type: ${input.typeName}\nTitle: ${input.title}\nContent: ${input.content}`,
      schema: autoTagSchema,
      maxTokens: 100,
    });

    return { success: true, data: object.tags };
  } catch (error) {
    console.error('AI auto-tag error:', error);
    return { success: false, error: 'Failed to generate tag suggestions' };
  }
}
```

### 2. AI Summary

**Purpose:** Generate a concise summary/description of an item.

**Approach:** Use `generateText` for simple text output.

```typescript
import { generateText } from 'ai';

export async function generateSummary(input: {
  title: string;
  content: string;
  typeName: string;
}): Promise<{ success: boolean; data?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const isPro = session.user.isPro ?? false;
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' };
  }

  try {
    const { text } = await generateText({
      model: AI_MODEL,
      system: SYSTEM_PROMPTS.summarize,
      prompt: `Title: ${input.title}\nContent: ${input.content}`,
      maxTokens: 150,
    });

    return { success: true, data: text };
  } catch (error) {
    console.error('AI summary error:', error);
    return { success: false, error: 'Failed to generate summary' };
  }
}
```

### 3. Code Explanation (Streaming)

**Purpose:** Explain a code snippet in detail. Uses streaming for better UX since explanations can be longer.

**Approach:** Use API route with `streamText` for real-time streaming.

```typescript
// src/app/api/ai/explain/route.ts

import { streamText } from 'ai';
import { AI_MODEL, SYSTEM_PROMPTS } from '@/lib/ai';
import { auth } from '@/auth';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Pro check from DB for API routes
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });
  if (!user?.isPro) {
    return new Response('Pro subscription required', { status: 403 });
  }

  const { content, language } = await request.json();

  const result = streamText({
    model: AI_MODEL,
    system: SYSTEM_PROMPTS.explainCode,
    prompt: `Language: ${language || 'unknown'}\n\nCode:\n\`\`\`\n${content}\n\`\`\``,
    maxTokens: 500,
  });

  return result.toDataStreamResponse();
}
```

### 4. Prompt Optimizer

**Purpose:** Improve/optimize an AI prompt.

**Approach:** Use `generateText` (non-streaming, since output replaces input).

```typescript
export async function optimizePrompt(input: {
  content: string;
}): Promise<{ success: boolean; data?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const isPro = session.user.isPro ?? false;
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' };
  }

  try {
    const { text } = await generateText({
      model: AI_MODEL,
      system: SYSTEM_PROMPTS.optimizePrompt,
      prompt: input.content,
      maxTokens: 400,
    });

    return { success: true, data: text };
  } catch (error) {
    console.error('AI prompt optimizer error:', error);
    return { success: false, error: 'Failed to optimize prompt' };
  }
}
```

---

## Server Action Patterns

### When to Use Server Actions vs API Routes

| Pattern | Use Case | AI Features |
|---|---|---|
| **Server Action** (`generateText`, `generateObject`) | Non-streaming, structured data | Auto-tag, Summary, Prompt Optimizer |
| **API Route** (`streamText`) | Streaming responses | Code Explanation |

### Server Action Pattern (Matches Existing Codebase)

All AI server actions should follow the established DevStash pattern:

```typescript
'use server';

import { auth } from '@/auth';
import { generateObject } from 'ai';
import { z } from 'zod';
import { AI_MODEL } from '@/lib/ai';

// 1. Define input schema
const inputSchema = z.object({
  content: z.string().min(1).max(10000),
  typeName: z.string(),
});

// 2. Define return type
interface AIActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 3. Implement action
export async function aiFeature(input: unknown): Promise<AIActionResult<string[]>> {
  // 3a. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // 3b. Pro gating
  const isPro = session.user.isPro ?? false;
  if (!isPro) {
    return { success: false, error: 'AI features require a Pro subscription' };
  }

  // 3c. Input validation
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  // 3d. AI call with try/catch
  try {
    const result = await generateObject({ ... });
    return { success: true, data: result.object };
  } catch (error) {
    console.error('AI feature error:', error);
    return { success: false, error: 'AI generation failed. Please try again.' };
  }
}
```

---

## Streaming vs Non-Streaming

### Decision Matrix

| Feature | Streaming? | Reason |
|---|---|---|
| Auto-tag | No | Short response (~50 tokens), structured data needed |
| Summary | No | Short response (~150 tokens), fills a single field |
| Code Explanation | **Yes** | Longer response (~300-500 tokens), better UX |
| Prompt Optimizer | No | Replaces content atomically, user accepts/rejects whole result |

### Streaming Implementation (Code Explanation)

**Server (API Route):**
```typescript
// Uses streamText + toDataStreamResponse()
const result = streamText({ model: AI_MODEL, ... });
return result.toDataStreamResponse();
```

**Client (React Hook):**
```typescript
'use client';

import { useCompletion } from '@ai-sdk/react';

function CodeExplanation({ content, language }: Props) {
  const { completion, isLoading, complete, stop } = useCompletion({
    api: '/api/ai/explain',
  });

  const handleExplain = () => {
    complete('', { body: { content, language } });
  };

  return (
    <div>
      <button onClick={handleExplain} disabled={isLoading}>
        {isLoading ? 'Explaining...' : 'Explain This Code'}
      </button>
      {isLoading && <button onClick={stop}>Stop</button>}
      {completion && <div className="prose dark:prose-invert">{completion}</div>}
    </div>
  );
}
```

### Non-Streaming Implementation (Auto-tag, Summary, Prompt Optimizer)

**Client (Direct Server Action Call):**
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSuggestTags = async () => {
  setIsLoading(true);
  const result = await suggestTags({ title, content, typeName });
  if (result.success && result.data) {
    setTags(result.data);
    toast.success('Tags suggested!');
  } else {
    toast.error(result.error || 'Failed to suggest tags');
  }
  setIsLoading(false);
};
```

---

## Error Handling & Rate Limiting

### Error Handling Strategy

```typescript
try {
  const result = await generateText({ ... });
  return { success: true, data: result.text };
} catch (error) {
  // Log detailed error server-side
  console.error('AI error:', error);

  // Return user-friendly message
  if (error instanceof Error) {
    if (error.message.includes('rate_limit')) {
      return { success: false, error: 'AI rate limit reached. Please wait a moment.' };
    }
    if (error.message.includes('context_length')) {
      return { success: false, error: 'Content is too long for AI processing. Try with shorter content.' };
    }
  }

  return { success: false, error: 'AI generation failed. Please try again.' };
}
```

### Rate Limiting for AI

Add a new rate limit config to the existing Upstash setup:

```typescript
// In src/lib/rate-limit.ts, add:
ai: {
  limiter: Ratelimit.slidingWindow(20, '1 h'),  // 20 AI calls per hour
  prefix: 'ratelimit:ai',
},
```

Usage in actions:
```typescript
const rateLimit = await checkRateLimit('ai', session.user.id);
if (!rateLimit.success) {
  return { success: false, error: `AI rate limit reached. Try again in ${formatRetryTime(rateLimit.retryAfter)}.` };
}
```

---

## Pro User Gating

### Pattern (Matches Existing Codebase)

All AI features are Pro-only. Use the same gating pattern already established:

**In Server Actions:**
```typescript
const isPro = session.user.isPro ?? false;
if (!isPro) {
  return { success: false, error: 'AI features require a Pro subscription' };
}
```

**In API Routes:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { isPro: true },
});
if (!user?.isPro) {
  return new Response(JSON.stringify({ error: 'Pro subscription required' }), { status: 403 });
}
```

**In UI (Show/Hide AI Buttons):**
```typescript
// Get isPro from session
const session = await auth();
const isPro = session?.user?.isPro ?? false;

// Conditionally render AI buttons
{isPro && <Button onClick={handleSuggestTags}>Suggest Tags</Button>}

// Or show upgrade prompt
{!isPro && (
  <Tooltip content="Upgrade to Pro for AI features">
    <Button disabled>Suggest Tags (Pro)</Button>
  </Tooltip>
)}
```

---

## Cost Optimization

### 1. Limit Token Usage

Set `maxTokens` on every call to prevent runaway costs:

```typescript
generateObject({ model: AI_MODEL, maxTokens: 100, ... }); // Auto-tag
generateText({ model: AI_MODEL, maxTokens: 150, ... });    // Summary
streamText({ model: AI_MODEL, maxTokens: 500, ... });      // Explanation
generateText({ model: AI_MODEL, maxTokens: 400, ... });    // Optimizer
```

### 2. Truncate Long Input

Limit input content length before sending to the API:

```typescript
function truncateContent(content: string, maxChars: number = 4000): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + '\n... (truncated)';
}
```

### 3. Rate Limiting (Per User)

20 AI calls per hour per user prevents abuse while being generous for normal use.

### 4. Debounce Client-Side

Don't fire AI calls on every keystroke. Use explicit button triggers or debounce:

```typescript
// Good: Explicit button trigger
<Button onClick={handleSuggestTags}>Suggest Tags</Button>

// Bad: Auto-trigger on content change
useEffect(() => { suggestTags(content); }, [content]); // DON'T do this
```

### 5. Cache Results (Optional, Future)

For repeated content (same item), cache AI results. Can be added later if costs grow:

```typescript
// Future: Store AI results in item metadata
// Check if tags were already suggested for this content hash
```

### Estimated Monthly Costs

| Scenario | AI Calls/Month | Estimated Cost |
|---|---|---|
| Light usage (10 Pro users) | ~1,000 | ~$0.15 |
| Moderate (100 Pro users) | ~10,000 | ~$1.50 |
| Heavy (1,000 Pro users) | ~100,000 | ~$15.00 |

---

## UI Patterns

### 1. Loading States

```typescript
// Button with spinner
<Button onClick={handleAI} disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Generating...
    </>
  ) : (
    <>
      <Sparkles className="mr-2 h-4 w-4" />
      Suggest Tags
    </>
  )}
</Button>
```

### 2. Accept/Reject for Tags

```typescript
// Show suggested tags with accept/reject
{suggestedTags && (
  <div className="flex flex-wrap gap-1">
    {suggestedTags.map(tag => (
      <Badge
        key={tag}
        variant="outline"
        className="cursor-pointer hover:bg-accent"
        onClick={() => addTag(tag)}
      >
        + {tag}
      </Badge>
    ))}
  </div>
)}
```

### 3. Accept/Reject for Generated Text

```typescript
// Summary or Optimizer result
{generatedText && (
  <div className="border rounded-md p-3 space-y-2">
    <p className="text-sm text-muted-foreground">{generatedText}</p>
    <div className="flex gap-2">
      <Button size="sm" onClick={() => acceptResult(generatedText)}>
        Accept
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setGeneratedText(null)}>
        Dismiss
      </Button>
    </div>
  </div>
)}
```

### 4. Streaming Display (Code Explanation)

```typescript
// Render markdown as it streams in
{completion && (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <ReactMarkdown>{completion}</ReactMarkdown>
  </div>
)}
```

### 5. AI Feature Placement

| Feature | Location | Trigger |
|---|---|---|
| Auto-tag | NewItemDialog, ItemDrawer edit mode | "Suggest Tags" button near tag input |
| Summary | NewItemDialog, ItemDrawer edit mode | "Generate Summary" button near description field |
| Code Explanation | ItemDrawer (view mode, snippets/commands) | "Explain This Code" button in action bar |
| Prompt Optimizer | ItemDrawer (edit mode, prompts) | "Optimize Prompt" button near content editor |

---

## Security Considerations

### 1. API Key Protection

- Store `OPENAI_API_KEY` in `.env.local` only (already in .gitignore)
- Never expose to client - all AI calls go through server actions or API routes
- The Vercel AI SDK handles this correctly when using server actions

### 2. Input Sanitization

```typescript
// Truncate to prevent excessive token usage
const sanitizedContent = input.content.slice(0, 10000);

// Validate with Zod schema
const inputSchema = z.object({
  content: z.string().min(1).max(10000),
  title: z.string().min(1).max(200),
  typeName: z.enum(['snippet', 'prompt', 'command', 'note', 'link']),
});
```

### 3. Prompt Injection Prevention

- Use the `system` message for instructions, `prompt` for user content
- Use structured outputs (`generateObject` with Zod) where possible - this constrains the output to a fixed schema and eliminates freeform channels
- Separate system instructions from user content with clear delimiters
- Never include user content in the system message

```typescript
// Good: Clear separation
generateObject({
  model: AI_MODEL,
  system: SYSTEM_PROMPTS.autoTag,  // Fixed system instruction
  prompt: `Type: ${typeName}\nTitle: ${title}\nContent: ${content}`,  // User content in prompt only
  schema: autoTagSchema,  // Output constrained by schema
});
```

### 4. Rate Limiting

- 20 AI calls per hour per authenticated user (via existing Upstash setup)
- Prevents abuse and controls costs
- Returns user-friendly retry-after message

### 5. Content Ownership

- All AI calls verify user authentication
- Items must belong to the requesting user (existing ownership check pattern)
- AI responses are not stored separately - they update item fields the user explicitly accepts

---

## Implementation Roadmap

### Phase 1: Foundation

1. Install `ai` and `@ai-sdk/openai` packages
2. Create `src/lib/ai.ts` with model config and system prompts
3. Add `OPENAI_API_KEY` to `.env.example`
4. Add `ai` rate limit config to `src/lib/rate-limit.ts`

### Phase 2: Auto-Tag

1. Create `suggestTags` server action in `src/actions/ai.ts`
2. Add "Suggest Tags" button to NewItemDialog (near tag input)
3. Add "Suggest Tags" button to ItemDrawer edit mode
4. Show suggested tags as clickable badges
5. Write unit tests for the server action

### Phase 3: AI Summary

1. Create `generateSummary` server action
2. Add "Generate Summary" button near description field in NewItemDialog
3. Add "Generate Summary" button in ItemDrawer edit mode
4. Show accept/dismiss UI for generated summary
5. Write unit tests

### Phase 4: Code Explanation (Streaming)

1. Create `/api/ai/explain` API route with `streamText`
2. Create `CodeExplanation` client component with `useCompletion`
3. Add "Explain This Code" button to ItemDrawer for snippets/commands
4. Render streamed markdown with `react-markdown`
5. Write unit tests for the API route

### Phase 5: Prompt Optimizer

1. Create `optimizePrompt` server action
2. Add "Optimize Prompt" button in ItemDrawer edit mode for prompts
3. Show original vs. optimized with accept/dismiss
4. Write unit tests

### Phase 6: Polish

1. Add Pro badges to AI buttons for free users
2. Ensure all AI buttons disabled/hidden for free tier
3. Add toast notifications for all AI actions
4. Test edge cases (empty content, very long content, rate limits)
5. Run full test suite and build

---

## File Structure

```
src/
├── lib/
│   └── ai.ts                    # Model config, system prompts, helpers
├── actions/
│   └── ai.ts                    # Server actions: suggestTags, generateSummary, optimizePrompt
├── app/
│   └── api/
│       └── ai/
│           └── explain/
│               └── route.ts     # Streaming code explanation endpoint
├── components/
│   └── ai/
│       ├── SuggestTagsButton.tsx # Auto-tag trigger + results display
│       ├── GenerateSummaryButton.tsx
│       ├── CodeExplanation.tsx   # Streaming explanation panel
│       └── OptimizePromptButton.tsx
```

---

## Dependencies to Add

```json
{
  "ai": "^5.x",
  "@ai-sdk/openai": "^1.x",
  "@ai-sdk/react": "^1.x"
}
```

No additional dependencies needed - the project already has `react-markdown`, `zod`, `sonner` (toast), and `lucide-react` (icons).

---

## Sources

- [GPT-5 Nano Model - OpenAI API](https://developers.openai.com/api/docs/models/gpt-5-nano)
- [GPT-5 Integration in Next.js SaaS - Vladimir Siedykh](https://vladimirsiedykh.com/blog/gpt-5-integration-nextjs-saas-features)
- [Vercel AI SDK Documentation](https://ai-sdk.dev)
- [AI SDK Cookbook - Generate Object](https://ai-sdk.dev/cookbook/rsc/generate-object)
- [AI SDK - Streaming Object Generation](https://ai-sdk.dev/examples/next-app/basics/streaming-object-generation)
- [OpenAI Node SDK](https://github.com/openai/openai-node)
- [OpenAI Safety Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OpenAI SDK vs Vercel AI SDK Comparison 2026](https://strapi.io/blog/openai-sdk-vs-vercel-ai-sdk-comparison)
- [GPT-5 Nano Pricing - OpenRouter](https://openrouter.ai/openai/gpt-5-nano)

---

_Generated: February 2026_
