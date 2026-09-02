import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { COLUMN_BY_ID, isEditableColumn, type ColumnDef, type EditableColumnId, type Row } from '../data/schema';
import { shortDate } from '../lib/time';
import { pendingEditFor, useStore } from '../store/useStore';

interface Props {
  row: Row;
  col: ColumnDef;
  agentFocused: boolean;
}

const SEVERITY_TONE: Record<string, string> = {
  P0: 'bg-[#FBE9EF] text-[#8E1046]',
  P1: 'bg-[#FDF1E4] text-[#8A4B00]',
  P2: 'bg-[#EEF2F7] text-[#2E4B7C]',
  P3: 'bg-ground text-ink-muted',
};

export function Cell({ row, col, agentFocused }: Props) {
  const editing = useStore((s) => s.editing);
  const pending = useStore((s) => pendingEditFor(s.proposals, row.id, col.id));
  const beginEdit = useStore((s) => s.beginEdit);
  const endEdit = useStore((s) => s.endEdit);
  const setCell = useStore((s) => s.setCell);
  const decideEdit = useStore((s) => s.decideEdit);

  const isEditing = !!editing && editing.rowId === row.id && editing.columnId === col.id;
  const editable = col.editable && isEditableColumn(col.id);
  const value = row[col.id];

  const base = 'relative flex h-[34px] items-center border-r border-rule px-2 text-[13px] leading-5';
  const tone = agentFocused && col.id === 'text' ? 'text-ink' : '';

  if (isEditing && editable) {
    return (
      <div className={`${base} ring-2 ring-inset ring-human`} data-col={col.id}>
        <Editor col={col} initial={value == null ? '' : String(value)} onCommit={(v) => { setCell(row.id, col.id as EditableColumnId, col.values ? (v || null) : v, 'human'); endEdit(); }} onCancel={endEdit} />
      </div>
    );
  }

  const open = () => { if (editable) beginEdit({ rowId: row.id, columnId: col.id as EditableColumnId }); };

  return (
    <div
      data-col={col.id}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : -1}
      onClick={open}
      onKeyDown={(e) => { if (editable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
      className={`${base} ${tone} ${editable ? 'cursor-text outline-none hover:bg-ground/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-human' : ''} ${col.id === 'text' ? 'min-w-0' : ''}`}
      title={col.id === 'text' ? String(value) : undefined}
    >
      {pending ? (
        <span className="flex min-w-0 items-center gap-1.5">
          {pending.edit.from ? <s className="truncate text-ink-muted">{pending.edit.from}</s> : null}
          <span className="truncate rounded-sm bg-agent/10 px-1 font-medium text-agent" title={pending.edit.rationale}>{pending.edit.to}</span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
            <button type="button" aria-label="Accept this edit" onClick={(e) => { e.stopPropagation(); decideEdit(pending.proposal.id, pending.edit.id, 'accepted'); }} className="grid size-5 place-items-center rounded text-human hover:bg-human/10 focus-visible:outline-2 focus-visible:outline-human"><Check className="size-3.5" /></button>
            <button type="button" aria-label="Reject this edit" onClick={(e) => { e.stopPropagation(); decideEdit(pending.proposal.id, pending.edit.id, 'rejected'); }} className="grid size-5 place-items-center rounded text-ink-muted hover:bg-ground focus-visible:outline-2 focus-visible:outline-human"><X className="size-3.5" /></button>
          </span>
        </span>
      ) : (
        <Display col={col} value={value} />
      )}
    </div>
  );
}

function Display({ col, value }: { col: ColumnDef; value: string | null }) {
  if (value == null || value === '') {
    return col.editable ? <span className="text-ink-muted/60">—</span> : null;
  }
  if (col.id === 'received') return <span className="tabular-nums text-ink-muted">{shortDate(value)}</span>;
  if (col.id === 'severity') return <span className={`rounded-sm px-1.5 py-px font-mono text-[11px] font-medium ${SEVERITY_TONE[value] ?? ''}`}>{value}</span>;
  if (col.id === 'status') return <span className={value === 'Escalated' ? 'font-medium text-agent' : value === 'New' ? 'text-ink-muted' : ''}>{value}</span>;
  if (col.id === 'notes') return <span className="truncate text-ink-muted" title={value}>{value.split('\n').at(-1)}</span>;
  if (col.id === 'text') return <span className="truncate">{value}</span>;
  if (col.id === 'source') return <span className="text-ink-muted">{value}</span>;
  return <span className="truncate">{value}</span>;
}

function Editor({ col, initial, onCommit, onCancel }: { col: ColumnDef; initial: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLSelectElement & HTMLInputElement>(null);
  const [v, setV] = useState(initial);
  useEffect(() => { ref.current?.focus(); if (ref.current && 'select' in ref.current && col.type === 'text') ref.current.select(); }, [col.type]);

  if (col.values) {
    return (
      <select
        ref={ref}
        aria-label={`${col.label} for this row`}
        value={v}
        onChange={(e) => { setV(e.target.value); onCommit(e.target.value); }}
        onBlur={() => onCommit(v)}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }}
        className="h-7 w-full rounded-sm bg-surface text-[13px] outline-none"
      >
        <option value="">—</option>
        {col.values.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      ref={ref}
      aria-label={`${col.label} for this row`}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(v); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      className="h-7 w-full bg-surface text-[13px] outline-none"
      placeholder={COLUMN_BY_ID.notes.label}
    />
  );
}
