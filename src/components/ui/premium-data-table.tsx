import { ReactNode, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from './skeleton';

export interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
  /** Show this column in mobile card view */
  mobileVisible?: boolean;
  /** Priority for mobile display (lower = shown first) */
  mobilePriority?: number;
  /** Sticky column */
  sticky?: boolean;
}

export interface TableAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive';
  /** Hide action for specific rows */
  hidden?: (row: T) => boolean;
}

interface PremiumDataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  actions?: TableAction<T>[];
  onRowClick?: (row: T) => void;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  className?: string;
  /** Title for card wrapper */
  title?: string;
  /** Description for card wrapper */
  description?: string;
  /** Header action */
  headerAction?: ReactNode;
  /** Use card layout on mobile instead of horizontal scroll */
  mobileCardView?: boolean;
  /** Zebra striping */
  striped?: boolean;
  /** Compact mode */
  compact?: boolean;
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function PremiumDataTable<T extends { id: string }>({
  columns,
  data,
  actions,
  onRowClick,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  isLoading,
  loadingRows = 5,
  className,
  title,
  description,
  headerAction,
  mobileCardView = true,
  striped = false,
  compact = false,
}: PremiumDataTableProps<T>) {
  // Sort columns by mobile priority for card view
  const mobileColumns = [...columns]
    .filter(col => col.mobileVisible !== false)
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99));

  const hasActions = actions && actions.length > 0;

  const renderContent = () => (
    <div className={cn('rounded-xl border border-border/50 overflow-hidden', !title && className)}>
      {/* Desktop Table View */}
      <div className={cn(
        "overflow-x-auto scrollbar-thin",
        mobileCardView && "hidden md:block"
      )}>
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card">
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                    compact ? 'h-10 px-3' : 'h-12 px-4',
                    col.sticky && 'sticky left-0 bg-muted/40 z-10',
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
              {hasActions && (
                <TableHead className={cn(
                  'text-right w-[70px] sticky right-0 bg-muted/40',
                  compact ? 'h-10 px-3' : 'h-12 px-4'
                )}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={columns.length + (hasActions ? 1 : 0)} rows={loadingRows} />
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="h-48"
                >
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    {EmptyIcon && (
                      <div className="rounded-full bg-muted/50 p-4 mb-3">
                        <EmptyIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <p className="font-medium text-foreground">{emptyTitle}</p>
                    {emptyDescription && (
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{emptyDescription}</p>
                    )}
                    {emptyAction && <div className="mt-4">{emptyAction}</div>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors border-b border-border/30 last:border-0',
                    onRowClick && 'cursor-pointer',
                    striped && rowIdx % 2 === 1 && 'bg-muted/20',
                    'hover:bg-muted/40'
                  )}
                >
                  {columns.map((col, idx) => (
                    <TableCell 
                      key={idx} 
                      className={cn(
                        compact ? 'py-2 px-3' : 'py-3 px-4',
                        col.sticky && 'sticky left-0 bg-card z-10',
                        col.className
                      )}
                    >
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as ReactNode)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className={cn('text-right sticky right-0 bg-card', compact ? 'py-2 px-3' : 'py-3 px-4')}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {actions.map((action, idx) => {
                            if (action.hidden?.(row)) return null;
                            const Icon = action.icon;
                            return (
                              <DropdownMenuItem
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(row);
                                }}
                                className={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                              >
                                {Icon && <Icon className="mr-2 h-4 w-4" />}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="md:hidden">
          {isLoading ? (
            <div className="divide-y divide-border/50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center">
              {EmptyIcon && (
                <div className="rounded-full bg-muted/50 p-4 mb-3 mx-auto w-fit">
                  <EmptyIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <p className="font-medium text-foreground">{emptyTitle}</p>
              {emptyDescription && (
                <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
              )}
              {emptyAction && <div className="mt-4">{emptyAction}</div>}
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {mobileColumns.slice(0, 4).map((col, idx) => {
                        const value = typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : (row[col.accessor] as ReactNode);
                        
                        // First item is primary (larger)
                        if (idx === 0) {
                          return (
                            <div key={idx} className="font-semibold text-foreground truncate">
                              {value}
                            </div>
                          );
                        }
                        
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                    {hasActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {actions.map((action, idx) => {
                            if (action.hidden?.(row)) return null;
                            const Icon = action.icon;
                            return (
                              <DropdownMenuItem
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(row);
                                }}
                                className={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                              >
                                {Icon && <Icon className="mr-2 h-4 w-4" />}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (title) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction}
        </CardHeader>
        <CardContent className="p-0">
          {renderContent()}
        </CardContent>
      </Card>
    );
  }

  return renderContent();
}
