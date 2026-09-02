import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { shortDate } from '../lib/time';

/** Full verbatim for the selected row: the table is dense, this is where you read. */
export function RowInspector() {
  const selection = useStore((s) => s.humanSelection);
  const rows = useStore((s) => s.rows);
  const selectRows = useStore((s) => s.selectRows);
  if (selection.length !== 1) return null;
  const row = rows.find((r) => r.id === selection[0]);
  if (!row) return null;

  return (
    <aside aria-label="Selected row" className="flex shrink-0 gap-4 border-t border-rule bg-surface px-4 py-3 text-[13px] leading-5">
      <span aria-hidden className="mt-1 w-[3px] shrink-0 rounded-full bg-human" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 flex flex-wrap gap-x-3 text-[12px] text-ink-muted">
          <span className="font-mono text-human">{row.id}</span>
          <span>{row.source}</span>
          <span>{shortDate(row.received)}</span>
          {row.area && <span className="text-ink">{row.area}</span>}
          {row.severity && <span className="text-ink">{row.severity}</span>}
          <span>{row.status}</span>
        </p>
        <p className="max-h-20 overflow-y-auto">{row.text}</p>
        {row.notes && (
          <p className="mt-1 whitespace-pre-line text-ink-muted">{row.notes}</p>
        )}
      </div>
      <button type="button" aria-label="Close" onClick={() => selectRows([])} className="grid size-7 shrink-0 place-items-center rounded text-ink-muted hover:bg-ground hover:text-ink focus-visible:outline-2 focus-visible:outline-human">
        <X className="size-4" />
      </button>
    </aside>
  );
}
