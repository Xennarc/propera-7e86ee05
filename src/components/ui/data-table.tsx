import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
  /** Show this column in mobile card view */
  mobileVisible?: boolean;
  /** Priority for mobile display (lower = shown first) */
  mobilePriority?: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  /** Use card layout on mobile instead of horizontal scroll */
  mobileCardView?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found',
  className,
  mobileCardView = true,
}: DataTableProps<T>) {
  // Sort columns by mobile priority for card view
  const mobileColumns = [...columns]
    .filter(col => col.mobileVisible !== false)
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99));

  return (
    <div className={cn('rounded-xl border border-border/50 overflow-hidden', className)}>
      {/* Desktop Table View */}
      <div className={cn(
        "overflow-x-auto scrollbar-thin",
        mobileCardView && "hidden md:block"
      )}>
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider text-muted-foreground h-11',
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-muted/50'
                  )}
                >
                  {columns.map((col, idx) => (
                    <TableCell key={idx} className={col.className}>
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="md:hidden">
          {data.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.map((row) => (
                <div
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "p-4 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/50 active:bg-muted"
                  )}
                >
                  <div className="space-y-2">
                    {mobileColumns.slice(0, 5).map((col, idx) => {
                      const value = typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as ReactNode);
                      
                      // First item is primary (larger)
                      if (idx === 0) {
                        return (
                          <div key={idx} className="font-semibold text-foreground">
                            {value}
                          </div>
                        );
                      }
                      
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{col.header}</span>
                          <span className={col.className}>{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
