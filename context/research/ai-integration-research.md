# AI Integration Research

## Output

docs/ai-integration-plan.md

## Research

Investigate best practices for integrating the OpenAI "gpt-5-nano" model into a Next.js application for the following features:

- Auto-tagging content
- AI-generated summaries
- Code explanation
- Prompt optimization

## Include

- OpenAI SDK setup and configuration
- Server action patterns for AI calls
- Streaming vs non-streaming responses
- Error handling and rate limiting
- Pro user gating patterns
- Cost optimization strategies
- UI patterns for AI features (loading states, accept/reject suggestions)
- Security considerations (API key handling, input sanitization)

## Sources

- Web search for OpenAI + Next.js patterns
- Context7 docs for OpenAI SDK
- Existing codebase patterns (server actions, Pro gating)
- @src/actions/\*.ts for action patterns
- @src/lib/usage-limits.ts for gating patterns
