import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface LedgerColumn<T> {
  header: string;
  accessorKey?: keyof T;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
  className?: string;
  cell?: (row: T, index: number) => React.ReactNode;
}

interface LedgerTableProps<T> {
  columns: LedgerColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function LedgerTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No ledger records found.',
  className,
  onRowClick,
}: LedgerTableProps<T>) {
  return (
    <div className={cn('w-full', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead
                key={idx}
                className={cn(
                  col.align === 'right' || col.isNumeric ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
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
                className="h-32 text-center text-muted-foreground text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIdx) => (
              <TableRow
                key={keyExtractor(row, rowIdx)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-slate-800/50 transition-colors'
                )}
              >
                {columns.map((col, colIdx) => (
                  <TableCell
                    key={colIdx}
                    className={cn(
                      col.isNumeric && 'font-mono tabular-nums text-foreground',
                      col.align === 'right' || col.isNumeric ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.className
                    )}
                  >
                    {col.cell
                      ? col.cell(row, rowIdx)
                      : col.accessorKey
                        ? (row[col.accessorKey] as React.ReactNode)
                        : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
