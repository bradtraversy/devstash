# DevStash Homepage Mockup Spec

Create a marketing homepage for DevStash - a developer knowledge hub for code snippets, AI prompts, commands, notes, files, images, and links.

**Output:** `prototypes/homepage/` with `index.html`, `styles.css`, `script.js`

---

## Color Palette

Dark theme with these accent colors for item types:

- Snippet: `#3b82f6` (Blue)
- Prompt: `#f59e0b` (Amber)
- Command: `#06b6d4` (Cyan)
- Note: `#22c55e` (Green)
- File: `#64748b` (Slate)
- Image: `#ec4899` (Pink)
- URL: `#6366f1` (Indigo)

---

## Hero Section (Main Focus)

The hero shows a "chaos to order" concept with three elements side by side:

### Chaos Container (Left)

A box labeled "Your knowledge today..." containing 8 floating icons representing where developers currently scatter their knowledge:

- Notion, GitHub, Slack, VS Code logos
- Browser tabs, Terminal, Text file, Bookmark icons

**The icons should animate:**

- Float around randomly, bouncing off walls
- Subtle rotation and scale pulsing
- Move away from mouse cursor on hover

### Transform Arrow (Center)

A pulsing arrow pointing from chaos to order.

### Dashboard Preview (Right)

A box labeled "...with DevStash" showing a simplified dashboard mockup:

- Sidebar with nav items
- Grid of item cards with colored top borders (using the item type colors)

---

## Other Sections

1. **Navigation** - Fixed top nav with logo, "Features"/"Pricing" links, Sign In/Get Started buttons

2. **Hero Text** - Above the visual: "Stop Losing Your Developer Knowledge" headline with gradient text, subheadline about scattered knowledge, CTA buttons

3. **Features** - 6 cards in a grid: Code Snippets, AI Prompts, Instant Search, Commands, Files & Docs, Collections. Each card uses its item type accent color.

4. **AI Section** - Two columns: Left has "Pro Feature" badge and checklist of AI capabilities. Right shows a code editor mockup with "AI Generated Tags" demo.

5. **Pricing** - Free ($0, 50 items, 3 collections) vs Pro ($8/mo, unlimited, AI features). Pro card highlighted with "Most Popular" badge. Also add a toggle for the yearly $72 option.

6. **CTA** - "Ready to Organize Your Knowledge?" with button

7. **Footer** - Logo, link columns, copyright with current year.

---

## Animations

- **Chaos icons**: JavaScript animation using requestAnimationFrame. Icons drift, bounce off walls, repel from mouse cursor.
- **Arrow**: CSS pulse animation
- **Scroll**: Elements fade in when scrolling into view
- **Navbar**: Gets more opaque on scroll

---

## Responsive

- Mobile: Stack the chaos/arrow/dashboard vertically, single column grids
- Arrow rotates 90° on mobile to point down
