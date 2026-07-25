import type { JSX } from 'react'
import { Button } from '@/components/ui/button'

export interface ServicesPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ServicesPagination({
  page,
  totalPages,
  onPageChange,
}: ServicesPaginationProps): JSX.Element {
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1)
          }}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => {
            onPageChange(page + 1)
          }}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
