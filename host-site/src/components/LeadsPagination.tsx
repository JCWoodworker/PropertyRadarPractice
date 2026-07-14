import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@parceliq/ui'

interface LeadsPaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  isFetching?: boolean
}

function buildPageItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) items.push('ellipsis')
  for (let n = start; n <= end; n += 1) items.push(n)
  if (end < totalPages - 1) items.push('ellipsis')
  items.push(totalPages)
  return items
}

export function LeadsPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  isFetching = false,
}: LeadsPaginationProps) {
  if (total === 0 || totalPages === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const items = buildPageItems(page, totalPages)

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-border px-3 py-3 sm:flex-row sm:px-4"
      aria-label="Leads pagination"
      data-fetching={isFetching || undefined}
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Prev
        </Button>

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`e-${index}`} className="px-2 text-sm text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === page ? 'default' : 'outline'}
              size="sm"
              className="min-w-9"
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
