import {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link as LinkIcon,
  LucideIcon,
} from 'lucide-react';

/**
 * Icon mapping for item types
 * Maps icon names from the database to Lucide React components
 */
export const ITEM_TYPE_ICONS: Record<string, LucideIcon> = {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  File,
  Image,
  Link: LinkIcon,
};

/**
 * Get icon component by name with fallback
 * Returns Code icon as default if icon name is not found
 */
export function getItemTypeIcon(iconName: string): LucideIcon {
  return ITEM_TYPE_ICONS[iconName] || Code;
}

/**
 * Default colors for item types
 */
export const ITEM_TYPE_COLORS = {
  snippet: '#3b82f6',
  prompt: '#8b5cf6',
  command: '#f97316',
  note: '#fde047',
  file: '#6b7280',
  image: '#ec4899',
  link: '#10b981',
} as const;
