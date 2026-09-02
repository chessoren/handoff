import type { ColumnId, Row } from '../data/schema';

export type FilterOp = 'equals' | 'contains' | 'isEmpty' | 'oneOf';
export interface RowFilter {
  columnId: ColumnId;
  op: FilterOp;
  value?: string;
}
export interface SortSpec {
  columnId: ColumnId;
  direction: 'asc' | 'desc';
}

export function matchesFilter(row: Row, f: RowFilter | null): boolean {
  if (!f) return true;
  const raw = row[f.columnId];
  const v = raw == null ? '' : String(raw);
  switch (f.op) {
    case 'isEmpty':
      return v.trim() === '';
    case 'equals':
      return v.toLowerCase() === (f.value ?? '').toLowerCase();
    case 'contains':
      return v.toLowerCase().includes((f.value ?? '').toLowerCase());
    case 'oneOf':
      return (f.value ?? '').split(',').map((x) => x.trim().toLowerCase()).includes(v.toLowerCase());
  }
}

export function sortRows(rows: Row[], s: SortSpec | null): Row[] {
  if (!s) return rows;
  const dir = s.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[s.columnId] ?? '';
    const bv = b[s.columnId] ?? '';
    if (av === bv) return a.id < b.id ? -1 : 1;
    if (av === '') return 1; // empties last, regardless of direction
    if (bv === '') return -1;
    return av < bv ? -dir : dir;
  });
}

export function describeFilter(f: RowFilter | null): string {
  if (!f) return 'all rows';
  if (f.op === 'isEmpty') return `${f.columnId} is empty`;
  if (f.op === 'oneOf') return `${f.columnId} in [${f.value ?? ''}]`;
  return `${f.columnId} ${f.op} "${f.value ?? ''}"`;
}
