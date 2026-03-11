# Import/Export

## Overview

Allow users to export their data as JSON (free) or ZIP with files (Pro), and import data from a previously exported JSON file. Located in a new "Data" section on the `/settings` page.

## Export

### JSON Export (Free)

- "Export JSON" button triggers a server action that queries all user items, collections, tags, and collection assignments
- Generates `devstash-export-{date}.json` downloaded via `/api/export` route
- File/image items include metadata (fileName, fileSize) but NOT actual files
- Export format:

```json
{
  "version": 1,
  "exportedAt": "2026-03-11T...",
  "items": [
    {
      "title": "useAuth hook",
      "type": "snippet",
      "content": "export function useAuth()...",
      "language": "typescript",
      "description": "Custom auth hook",
      "tags": ["react", "auth"],
      "collections": ["React Patterns"],
      "isFavorite": true,
      "isPinned": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "collections": [
    {
      "name": "React Patterns",
      "description": "Common React patterns",
      "isFavorite": false
    }
  ]
}
```

### ZIP Export (Pro)

- "Export ZIP" button with PRO badge
- Same JSON manifest as above + actual files/images from R2 in a `/files` directory
- Downloads `devstash-export-{date}.zip`

## Import

### UI Flow

1. "Import" button opens a dialog
2. File drop zone for `.json` files (reuse FileUpload drag-and-drop pattern)
3. After file selected, parse and show a preview summary:
   - Item counts by type (e.g. "8 snippets, 6 prompts, 5 commands")
   - Collection count
   - Tag count
4. "Skip duplicates" checkbox (matches on title + type + content hash)
5. "Import" button with progress indicator
6. Toast on completion: "Imported 24 items and 4 collections"

### Mechanics

- Server action validates JSON against Zod schema matching export format
- Creates collections first, then items with tag connectOrCreate, then collection assignments
- All wrapped in a Prisma transaction
- Free tier limits enforced (50 items / 3 collections) - stops and shows warning if exceeded
- Skips file/image type items for free users
- Duplicate detection: match on title + type + content/URL

## Settings Page UI

New "Data" section between Billing and Account:

```
┌─────────────────────────────────────┐
│  Data                               │
│                                     │
│  Export your data or import from     │
│  a previous export.                 │
│                                     │
│  [Export JSON]  [Export ZIP] [PRO]   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [Import from JSON]                 │
└─────────────────────────────────────┘
```

## Files Involved

- `src/components/settings/DataSettings.tsx` - new settings section component
- `src/app/(dashboard)/settings/page.tsx` - add DataSettings between Billing and Account
- `src/actions/export.ts` - exportData server action
- `src/actions/import.ts` - importData server action with Zod validation
- `src/app/api/export/route.ts` - GET route that streams the JSON/ZIP download
- `src/lib/db/export.ts` - query to fetch all user data for export
- `src/components/settings/ImportDialog.tsx` - import modal with preview and progress
- Unit tests for export/import actions

## Validation

- Export Zod schema for the JSON format (used on import to validate structure)
- Version field for future format migrations
- Graceful handling of malformed JSON with user-friendly error messages
