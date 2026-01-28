/**
 * Format a date as a relative time string
 * Returns "Today", "Yesterday", "X days ago", or a formatted date
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dateObj.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
}
