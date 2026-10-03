# App Shell Design Brief

A clickable mockup of the signed-in DevStash app, reworked so your own things stay easy to find and any of them is one click from a link. It is a reference for deciding before anything in `src/` changes. Nothing here is accepted yet.

## Preview

Open `prototypes/app-shell/index.html` in a browser. No server is needed. Fonts load from Google Fonts and the icons are bundled in `icons.js`, generated from the installed lucide-react so they match the app.

The amber strip at the top is not part of the design. It switches:

- Sidebar: by type (the pick), or library first for comparison
- Data: a full stash of 16 items and 4 collections, or a new user with nothing saved

## Screens

- **Sidebar**: Home, Shared, Favorites, then Types with counts, then Collections with a mark on shared ones.
- **Home**: a paste box first (Save, or Save and share), then "Your stash" with filter chips (All, Shared, Pinned) and one list of everything, pinned first.
- **Every item list**: dense rows by default, with a Rows and Code cards switch on the right of the bar above it.
- **Shared**: every shared item and collection with its link, Copy link, Image, and Stop sharing.
- **Favorites**: starred items.
- **Type pages**: Snippets, Commands, and so on, with a New button for that type.
- **Collection**: Private, Unlisted, Public control with the link beside the title, items in public order.
- **Drawer**: sharing block on top (the visibility control, a one-line explanation, then either Share with a link or the link with Copy, Open page, Raw, Image), then Favorite, Pin, Edit, More, then description, content, tags, collections, dates.
- **New user**: Home says "Start your stash" with the paste box and three samples that fill it.

## What works

- Share on a private row makes it unlisted and copies the link in one click; the pill, counts, Shared page, and drawer update together.
- The paste box guesses command, link, or snippet (and the language), shows the title it will use, and adds the row. Save and share puts the link under the box with Copy, Image, and Details. Ctrl+Enter saves, Ctrl+Shift+Enter saves and shares.
- Visibility changes in the drawer or on a collection, Stop sharing on the Shared page, Favorite and Pin toggles, copy content, copy link.
- Search filters the current list by title, description, language, and tags, with a no-match state; Ctrl+K or Cmd+K focuses it.
- The Rows and Code cards switch changes every list at once and keeps focus on the switch.
- Rows and cards open the drawer on click or Enter; Escape closes menus, then the drawer, then the mobile sidebar; focus returns to the row.
- Below 1024px the sidebar is a slide-over. Below 640px share buttons go icon only and shared rows put the link under the title.

## Mocked

Sample data only, nothing persists, and links are fake `devstash.io` URLs. Edit, Delete, Add to collection, New collection, Open page, Raw, and every image action show a "Not in the mockup" toast instead of pretending. Copying uses the real clipboard where the browser allows it; the toast shows either way.

## Visual direction

The app's own dark theme: near-black page, `#111` panels, hairline white borders at 8 to 16 percent, Geist for text and Geist Mono for code and links. The item type colors stay on the type icons. Blue means shared: the Unlisted and Public pills, share actions, and the link text. Private is a quiet lock. Share buttons stay neutral until their row is hovered or focused so a long list is not a wall of blue. The code colors follow dark-plus, the theme the public pages use.

Reusable pieces: the visibility pill, the three-way visibility control, the link box (URL plus Copy link), the dense row, the paste box.

## Decisions

Brad, 2026-10-03:

- Finding your stuff and sharing it both have to be easy; see it before the app changes.
- Dense rows are the default, and users can switch any list to code cards.
- The sidebar stays by type, with Home, Shared, and Favorites above the types.

Suggestions in this mockup, not decided:

- Home leads with the paste box and drops the four stat cards.
- A Shared page lists every live link in one place.
- The drawer puts all sharing in one block on top and trims the action bar to Favorite, Pin, Edit, More.

## Open questions

- Does the paste box replace the top-bar Share dialog, or do both stay?
- Is the Rows or Code cards choice remembered once per user, or per page?
- The sidebar's Shared count includes collections (7) while the Home chip counts items (5). Keep or align?
- The live app loads Geist but renders the system font because `--font-sans` is not wired to it. Use Geist as here, or drop it?
- Is anything from the stat cards worth keeping somewhere?

## Verified

In headless Chromium at 1440, 900, and 375 pixels wide: every screen above in the full and new-user states, the Rows and Code cards switch, both sidebars, row Share, drawer visibility changes, Stop sharing, the paste box guess with Save and share, search and the no-match state, Ctrl+K, focus returning to the row after Escape, no console errors, and no horizontal scroll at 375. Not checked: Safari, Firefox, a screen reader, or the clipboard when opened from a file.
