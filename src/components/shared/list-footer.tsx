import Pagination from "@/components/shared/pagination";
import PageSizeSelect from "@/components/shared/page-size-select";
import { PAGE_SIZES, type PageSize } from "@/lib/page-size";

interface ListFooterProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: PageSize;
  baseUrl: string;
}

/** Page links plus the page size choice, which only appears once a list is longer than the smallest size. */
export default function ListFooter({ currentPage, totalPages, totalCount, pageSize, baseUrl }: ListFooterProps) {
  const showSize = totalCount > PAGE_SIZES[0];
  if (!showSize && totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      {showSize ? <PageSizeSelect pageSize={pageSize} /> : <span />}
      <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={baseUrl} />
    </div>
  );
}
