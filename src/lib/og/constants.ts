export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** Code lines shown on an item card; the panel fits ten at the card's line height. */
export const OG_PREVIEW_LINES = 10;

/** Item rows shown on a collection card, including the `+ n more` row when there is one. */
export const OG_COLLECTION_ROWS = 8;

export const OG_MAX_LINE_CHARS = 120;

/** The full snippet image: a safety rail, not a product limit. */
export const IMAGE_MAX_LINES = 500;

// Sized so a full line fits inside IMAGE_MAX_WIDTH; wider rows make satori squeeze the tokens together.
export const IMAGE_MAX_LINE_CHARS = 170;

// Visible cells across the image; PNG size grows with them and a Vercel function response caps at 4.5 MB.
export const IMAGE_MAX_CHARS = 12_000;

export const IMAGE_MIN_WIDTH = 1200;

export const IMAGE_MAX_WIDTH = 2400;
