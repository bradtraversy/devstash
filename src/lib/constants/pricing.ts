export const FREE_FEATURES = [
  { text: '50 items', included: true },
  { text: '3 collections', included: true },
  { text: 'Snippets, Prompts, Commands, Notes, Links', included: true },
  { text: 'Share links, images, and public collections', included: true },
  { text: 'Basic search', included: true },
  { text: 'File & Image uploads', included: false },
  { text: 'AI features', included: false },
] as const;

export const PRO_FEATURES = [
  'Unlimited items',
  'Unlimited collections',
  'All item types including Files & Images',
  'AI auto-tagging & summaries',
  '\u201CExplain This Code\u201D',
  'AI Prompt Optimizer',
  'ZIP export with your files',
] as const;
