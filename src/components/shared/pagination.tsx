import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5; // Max number of page buttons to show

    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const buildUrl = (page: number): string => {
    if (page === 1) {
      return baseUrl;
    }
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${page}`;
  };

  const pageNumbers = getPageNumbers();
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {/* Previous button */}
      {hasPrev ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className={cn(
            'flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Link>
      ) : (
        <span
          className={cn(
            'flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-medium',
            'cursor-not-allowed opacity-50'
          )}
          aria-disabled="true"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground'
              )}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* Next button */}
      {hasNext ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className={cn(
            'flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground'
          )}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className={cn(
            'flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-medium',
            'cursor-not-allowed opacity-50'
          )}
          aria-disabled="true"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
