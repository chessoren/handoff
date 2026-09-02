import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { COLUMNS, type ColumnId, type Row } from '../data/schema';
import { useStore, visibleRows } from '../store/useStore';
import { AgentCursor } from './AgentCursor';
import { Cell } from './Cell';

const GRID = `44px ${COLUMNS.map((c) => (c.id === 'text' ? 'minmax(320px,1fr)' : `${c.width}px`)).join(' ')}`;

export function DataTable() {
  const rows = useStore((s) => s.rows);
  const view = useStore((s) => s.view);
  const agent = useStore((s) => s.agent);
  const humanSelection = useStore((s) => s.humanSelection);
  const selectRows = useStore((s) => s.selectRows);
  const setView = useStore((s) => s.setView);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => visibleRows({ rows, view }), [rows, view]);
  const agentSet = useMemo(() => new Set(agent?.rowIds ?? []), [agent]);
  const humanSet = useMemo(() => new Set(humanSelection), [humanSelection]);

  const groups = useMemo(() => {
    if (!view.groupBy) return [{ key: null as string | null, rows: visible }];
    const map = new Map<string, Row[]>();
    for (const r of visible) {
      const k = String(r[view.groupBy] ?? '—');
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()].map(([key, rows]) => ({ key, rows }));
  }, [visible, view.groupBy]);

  const toggleSort = (id: ColumnId) => {
    const cur = view.sortBy;
    const direction = cur?.columnId === id && cur.direction === 'asc' ? 'desc' : 'asc';
    setView({ sortBy: cur?.columnId === id && cur.direction === 'desc' ? null : { columnId: id, direction } }, view.preset === 'review' ? 'review' : 'custom');
  };

  const toggleSelect = (id: string, additive: boolean) => {
    if (additive) selectRows(humanSet.has(id) ? humanSelection.filter((x) => x !== id) : [...humanSelection, id]);
    else selectRows(humanSet.has(id) && humanSelection.length === 1 ? [] : [id]);
  };

  return (
    <div ref={scrollRef} className="relative h-full overflow-auto bg-surface" role="grid" aria-label="Customer feedback" aria-rowcount={visible.length}>
      <div className="sticky top-0 z-10 grid border-b border-rule bg-surface text-[11px] font-medium uppercase tracking-[0.06em] text-ink-muted" style={{ gridTemplateColumns: GRID }} role="row">
        <div className="flex h-8 items-center justify-center border-r border-rule font-mono normal-case tracking-normal" role="columnheader">#</div>
        {COLUMNS.map((c) => {
          const sorted = view.sortBy?.columnId === c.id;
          return (
            <div key={c.id} role="columnheader" aria-sort={sorted ? (view.sortBy!.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="border-r border-rule">
              <button
                type="button"
                onClick={() => toggleSort(c.id)}
                aria-label={`Sort by ${c.label}`}
                className="flex h-8 w-full items-center gap-1 px-2 text-left uppercase hover:bg-ground/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-human"
              >
                {c.label}
                {sorted && (view.sortBy!.direction === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
              </button>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div role="row">
          <p role="gridcell" className="px-4 py-10 text-center text-[13px] text-ink-muted">No rows match this view.</p>
        </div>
      )}

      {groups.map((g, gi) => (
        <div key={g.key ?? gi}>
          {g.key !== null && (
            <div className="sticky top-8 z-[5] border-b border-rule bg-ground/95 backdrop-blur" role="row">
              <div role="gridcell" aria-colspan={COLUMNS.length + 1} className="flex h-7 items-center gap-2 px-3 text-[12px]">
                <span className="font-medium">{g.key}</span>
                <span className="font-mono text-[11px] text-ink-muted">{g.rows.length}</span>
              </div>
            </div>
          )}
          {g.rows.map((r) => {
            const isAgent = agentSet.has(r.id);
            const isHuman = humanSet.has(r.id);
            const index = Number(r.id.slice(3));
            return (
              <div
                key={r.id}
                data-row-id={r.id}
                role="row"
                aria-selected={isHuman}
                className={`group grid border-b border-rule transition-colors duration-150 ${isAgent ? 'bg-agent/[0.07]' : isHuman ? 'bg-human/[0.07]' : 'hover:bg-ground/40'}`}
                style={{ gridTemplateColumns: GRID }}
              >
                <button
                  type="button"
                  role="gridcell"
                  aria-label={`Select row ${index}`}
                  onClick={(e) => toggleSelect(r.id, e.metaKey || e.ctrlKey || e.shiftKey)}
                  className={`relative flex h-[34px] items-center justify-center border-r border-rule font-mono text-[11px] tabular-nums text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-human ${isHuman ? 'text-human' : ''}`}
                >
                  {(isAgent || isHuman) && (
                    <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${isAgent ? 'bg-agent' : 'bg-human'}`} />
                  )}
                  {index}
                </button>
                {COLUMNS.map((c) => (
                  <Cell key={c.id} row={r} col={c} agentFocused={isAgent} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
      <AgentCursor scrollRef={scrollRef} />
    </div>
  );
}
