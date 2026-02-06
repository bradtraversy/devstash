# Markdown Editor Spec

## Overview

Add a Markdown editor component for notes and prompts with Write/Preview tabs and proper dark theme styling.

## Requirements

- Create MarkdownEditor component with tabbed interface (Write/Preview)
- Replace Textarea with MarkdownEditor for notes and prompts only
- Keep CodeEditor for snippets and commands (no changes)
- Use react-markdown with remark-gfm for GitHub Flavored Markdown support
- Match existing dark theme styling (bg-[#1e1e1e] container, bg-[#2d2d2d] header)
- Add copy button in header (same style as CodeEditor)
- Support both display (readonly) and edit modes
- In readonly mode, only show Preview tab
- In edit mode, default to Write tab with Preview available

## Styling Requirements

- Headings (h1-h6) must be visually distinct with proper sizing and weight
- Code blocks with dark background and monospace font
- Inline code with subtle background highlight
- Lists (ordered/unordered) with proper indentation and bullets
- Blockquotes with left border accent
- Links in blue with hover state
- Tables with borders and header background
- Use custom CSS class (e.g., `.markdown-preview`) for reliable dark mode styling
- Fluid height with max 400px, matching CodeEditor behavior

## Integration Points

- NewItemDialog: Use for note and prompt content field
- ItemDrawer (edit mode): Use for note and prompt content field
- ItemDrawer (view mode): Use in readonly mode for note and prompt content
