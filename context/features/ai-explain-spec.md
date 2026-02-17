# AI Explain Code

## Overview

Add AI-powered code explanation for snippets and commands in the item drawer using OpenAI "gpt-5-nano" model. These are the two item types where explanation adds value — actual code and terminal commands. Other types (prompts, notes, links, files, images) are already human-readable or non-code. Pro-only feature. Explanation displays inline via a tab interface in the code editor, not as a separate panel.

## Requirements

- Create an `explainCode` server action with auth, Pro gating, Zod validation, rate limiting
- Add "Explain" button (Sparkles icon) to code editor window controls header (next to Copy button)
- Only show for snippet and command types in the item drawer (not in create/edit forms)
- After generating, show Code/Explain tabs in the editor header to toggle between views
- Render explanation as markdown in the same container space as the code editor
- Explanation should be concise (~200-300 words) covering what the code does and key concepts
- Loading state: Loader2 spinner while generating
- Pro gating in UI: show Crown icon + tooltip ("AI features require Pro subscription") for free users
- Error handling via toast (Pro gating, rate limit, AI service errors)
- Follow existing patterns
- Unit tests for server action

## Notes

- Explanations are not saved to the database — regenerated on each click
- Not available in create/edit forms, only in the item drawer read view
- `isPro` needs to be passed as a prop to the item drawer / code editor
- See `docs/ai-integration-plan.md` for full architectural context
