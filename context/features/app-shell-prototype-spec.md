# App Shell Prototype Spec

A clickable mockup of the signed-in app around "Stash it. Share it.": finding your own things stays easy, and sharing any of them is one click away. It is a design reference to look at before changing the real dashboard, sidebar, item lists, or drawer.

**Output:** `prototypes/app-shell/` with `index.html`, `styles.css`, `script.js`, `icons.js` (generated from the installed lucide-react icons), and `design-brief.md`. Static files, sample data only, no production routes or database.

---

## Screens

- **Home**: a paste box at the top (Save, or Save and share), filter chips for Shared, Pinned, and each type, then one dense list of everything with pinned items first.
- **Shared**: every shared item and collection with its link, Copy link, Image, and Stop sharing.
- **Favorites**: favorited items as rows.
- **Collection**: header with visibility and link, then its items in order.
- **Drawer**: opens from any row. A sharing block on top (Private, Unlisted, Public; the link with Copy; Open, Raw, Image), then Favorite, Pin, Edit, More, then the content, tags, collections, and dates.

## Rows

One dense row per item: type icon, title, a short description, language, visibility, updated time. A shared row shows Copy link; a private row shows Share, which makes it unlisted and copies the link in one click. Copy content is on every text row.

Rows are the default. A Rows and Code cards switch above every item list lets the user change it.

## Mockup controls

A strip above the app, styled apart from it, switches:

- Sidebar: by type (Home, Shared, Favorites, then types, then collections; the default) or library first (types become filter chips on Home).
- Data: a full stash or a new user with nothing saved.

## States and behavior

- New user: Home shows the paste box with an invitation and sample buttons that fill it.
- Search in the top bar filters the current list by title, description, and tags; Ctrl+K or Cmd+K focuses it.
- Paste box guesses command, link, or snippet from the text and adds the row; Save and share shows the link right under the box.
- Visibility changes update the row, the drawer, and the Shared counts together, with a toast.
- Edit, Delete, image download, and Raw are not built; they say so in a toast instead of pretending.
- Keyboard: rows are focusable and open on Enter, Escape closes the drawer and menus, focus is visible, reduced motion turns off the drawer slide.
- Responsive down to 375px: the sidebar becomes a slide-over below 1024px, rows drop the description and time on small screens.

## Look

Matches the app: dark theme, the app's neutral surfaces and borders, the item type colors, blue for share actions, Geist and Geist Mono.

## Out of scope

Real data, auth, editing, the public pages themselves, and any change to `src/`.
