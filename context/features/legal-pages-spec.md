# Footer, Privacy, and Terms

## Overview

The homepage footer links Changelog, API, Blog, About, Privacy, and Terms to `#`. About 710 people have given DevStash their email and their content, and AI helpers send item text to OpenAI, so the missing Privacy and Terms pages are the real gap. This feature removes the dead links, adds plain-language Privacy and Terms pages, links the public GitHub repo, and tells people on the register form that creating an account means agreeing to both. Operator: Traversy Media; contact: brad@traversymedia.com (Brad, 2026-10-06).

Branch: `feature/legal-pages` off `main`, one implementation commit, then a pull request.

## Requirements

- `/privacy` and `/terms` render markdown from `src/content/legal/` through `MarkdownBlock` on the docs content panel, with the homepage Navbar and Footer, the page title, a last-updated date, and metadata (title, description, canonical). `src/lib/legal.ts` holds the two pages and reads their markdown.
- Privacy covers what is collected (account details, saved content, cookieless page view analytics, IP addresses for rate limiting), how it is used, the services that process it (Vercel, Neon, Upstash, Resend, OpenAI, GitHub, Cloudflare R2, Stripe while off), cookies (sign-in and two preference cookies, no tracking), export, unsharing, and account deletion. Uploaded files are not removed by account deletion yet, so the page says to email for that until it is fixed.
- Terms cover the account, ownership of content and the permission needed to host and share it, what sharing exposes (others can copy and save), acceptable use, removal of content that breaks the rules, the free service and possible changes, notice before a shutdown, no warranty, limited liability, changes to the terms, and contact.
- `privacy` and `terms` join `RESERVED_HANDLES`.
- Footer: Product (Features, Sharing, Pricing while Pro is on), Resources (Docs, GitHub), Legal (Privacy, Terms); no `#` links remain. The copyright line names Traversy Media.
- Register form: a line under the form saying that creating an account means agreeing to the Terms and Privacy Policy, both linked.

## Testing

- `src/lib/legal.ts`: both pages have a markdown file that does not start with an h1.
- The reserved-handles test covers the new routes.
- `npm run verify`, an independent review of code and copy, and a browser check of both pages, the footer links, and the register line at desktop and phone widths.

## Out of scope

- Legal review of the copy, a cookie banner (no tracking cookies are set), Changelog, API, Blog, and About pages, and deleting R2 files on account deletion (its own task).
