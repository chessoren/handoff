import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import seed from '../data/feedback.json';
import { type ColumnId, type EditableColumnId, type Row } from '../data/schema';
import { matchesFilter, sortRows, type RowFilter, type SortSpec } from '../lib/filter';
import { nextId } from '../lib/ids';

/* ────────────────────────────── types ────────────────────────────── */

/** Who may write right now. 'human' closes the agent's write tools. */
export type Control = 'shared' | 'human' | 'agent';

export interface CellRef { rowId: string; columnId: EditableColumnId }

export interface AgentPresence {
  rowIds: string[];
  columnId: ColumnId | null;
  reason: string;
  at: number;
}

export interface ProposedEdit {
  id: string;
  rowId: string;
  columnId: EditableColumnId;
  from: string | null;
  to: string;
  rationale?: string;
  decision: 'pending' | 'accepted' | 'rejected';
}

export interface Proposal {
  id: string;
  label: string;
  createdAt: number;
  edits: ProposedEdit[];
}

export interface ControlRequest {
  id: string;
  reason: string;
  estimatedEdits: number;
  resolve: (granted: boolean) => void;
}

export type LogKind = 'call' | 'result' | 'blocked' | 'register' | 'unregister' | 'human' | 'system';
export interface LogEntry {
  id: string;
  at: number;
  kind: LogKind;
  tool?: string;
  summary: string;
  detail?: unknown;
  durationMs?: number;
}

export interface View {
  filter: RowFilter | null;
  sortBy: SortSpec | null;
  groupBy: ColumnId | null;
  /** When set, only these rows are shown (used by "Review proposal"). */
  rowIds: string[] | null;
  preset: string;
}

export type SavedView = { id: string; label: string; view: Omit<View, 'preset' | 'rowIds'> };

export const SAVED_VIEWS: SavedView[] = [
  { id: 'all', label: 'All feedback', view: { filter: null, sortBy: null, groupBy: null } },
  { id: 'untagged', label: 'Untagged', view: { filter: { columnId: 'area', op: 'isEmpty' }, sortBy: null, groupBy: null } },
  { id: 'urgent', label: 'P0 · P1', view: { filter: { columnId: 'severity', op: 'contains', value: 'P' }, sortBy: { columnId: 'severity', direction: 'asc' }, groupBy: 'severity' } },
  { id: 'billing', label: 'Billing', view: { filter: { columnId: 'area', op: 'equals', value: 'Billing' }, sortBy: null, groupBy: null } },
  { id: 'escalated', label: 'Escalated', view: { filter: { columnId: 'status', op: 'equals', value: 'Escalated' }, sortBy: null, groupBy: null } },
];

interface State {
  rows: Row[];
  view: View;
  humanSelection: string[];
  editing: CellRef | null;
  control: Control;
  agent: AgentPresence | null;
  proposals: Proposal[];
  controlRequest: ControlRequest | null;
  log: LogEntry[];
  supported: boolean;
  hydrated: boolean;
}

interface Actions {
  // human edits
  beginEdit: (cell: CellRef) => void;
  endEdit: () => void;
  setCell: (rowId: string, columnId: EditableColumnId, value: string | null, by: 'human' | 'agent') => void;
  appendNote: (rowId: string, text: string, by: 'human' | 'agent') => void;
  selectRows: (rowIds: string[]) => void;
  // view
  setView: (patch: Partial<Omit<View, 'preset'>>, preset?: string) => void;
  reviewProposal: (proposalId: string | null) => void;
  applySavedView: (id: string) => void;
  // agent presence
  setAgentPresence: (p: AgentPresence | null) => void;
  // proposals
  addProposal: (label: string, edits: Omit<ProposedEdit, 'id' | 'decision' | 'from'>[]) => Proposal;
  decideEdit: (proposalId: string, editId: string, decision: 'accepted' | 'rejected') => void;
  decideAll: (proposalId: string, decision: 'accepted' | 'rejected') => void;
  // control
  setControl: (c: Control) => void;
  openControlRequest: (r: Omit<ControlRequest, 'id'>) => string;
  resolveControlRequest: (id: string, granted: boolean) => void;
  // log
  appendLog: (e: Omit<LogEntry, 'id' | 'at'>) => void;
  // misc
  setSupported: (s: boolean) => void;
  reset: () => void;
}

export type Store = State & Actions;

/* ─────────────────────────── persistence ─────────────────────────── */

const STORAGE_KEY = 'handoff.workspace.v1';
type Persisted = Pick<State, 'rows' | 'proposals' | 'log'>;

function load(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (!Array.isArray(parsed.rows) || parsed.rows.length !== (seed as Row[]).length) return {};
    return parsed;
  } catch {
    return {};
  }
}

function save(s: State) {
  try {
    const data: Persisted = { rows: s.rows, proposals: s.proposals, log: s.log.slice(-300) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: run in memory */
  }
}

/* ────────────────────────────── store ────────────────────────────── */

const seedRows = () => (seed as Row[]).map((r) => ({ ...r }));

const initial = (): State => {
  const persisted = load();
  return {
    rows: persisted.rows ?? seedRows(),
    view: { filter: null, sortBy: null, groupBy: null, rowIds: null, preset: 'all' },
    humanSelection: [],
    editing: null,
    control: 'shared',
    agent: null,
    proposals: persisted.proposals ?? [],
    controlRequest: null,
    log: persisted.log ?? [],
    supported: false,
    hydrated: true,
  };
};

let idleTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    ...initial(),

    beginEdit: (cell) => {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      const wasHuman = get().control === 'human';
      set({ editing: cell, control: get().control === 'agent' ? 'agent' : 'human' });
      if (!wasHuman && get().control === 'human') {
        get().appendLog({ kind: 'human', summary: 'You took the wheel: write tools withdrawn' });
      }
    },

    endEdit: () => {
      set({ editing: null });
      if (get().control !== 'human') return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (get().editing === null && get().control === 'human') {
          set({ control: 'shared' });
          get().appendLog({ kind: 'human', summary: 'You stepped back: write tools restored' });
        }
      }, 2000);
    },

    setCell: (rowId, columnId, value, by) => {
      set((s) => ({
        rows: s.rows.map((r) => (r.id === rowId ? { ...r, [columnId]: value } : r)),
      }));
      if (by === 'human') {
        const row = get().rows.find((r) => r.id === rowId);
        get().appendLog({ kind: 'human', summary: `You set ${columnId} to "${value ?? ''}" on ${rowId}`, detail: { rowId, columnId, value, text: row?.text } });
      }
    },

    appendNote: (rowId, text, by) => {
      set((s) => ({
        rows: s.rows.map((r) => {
          if (r.id !== rowId) return r;
          const prefix = by === 'agent' ? 'ChatGPT: ' : '';
          const notes = r.notes ? `${r.notes}\n${prefix}${text}` : `${prefix}${text}`;
          return { ...r, notes };
        }),
      }));
    },

    selectRows: (rowIds) => set({ humanSelection: rowIds }),

    setView: (patch, preset = 'custom') => set((s) => ({ view: { ...s.view, rowIds: null, ...patch, preset } })),

    reviewProposal: (proposalId) => {
      if (!proposalId) { set((s) => ({ view: { ...s.view, rowIds: null, preset: s.view.rowIds ? 'all' : s.view.preset } })); return; }
      const p = get().proposals.find((x) => x.id === proposalId);
      if (!p) return;
      const ids = [...new Set(p.edits.filter((e) => e.decision === 'pending').map((e) => e.rowId))];
      set({ view: { filter: null, sortBy: null, groupBy: null, rowIds: ids, preset: 'review' } });
    },

    applySavedView: (id) => {
      const sv = SAVED_VIEWS.find((v) => v.id === id);
      if (!sv) return;
      set({ view: { ...sv.view, rowIds: null, preset: id } });
    },

    setAgentPresence: (p) => set({ agent: p }),

    addProposal: (label, edits) => {
      const rowsById = new Map(get().rows.map((r) => [r.id, r]));
      const proposal: Proposal = {
        id: nextId('prop'),
        label,
        createdAt: Date.now(),
        edits: edits.map((e) => ({
          id: nextId('edit'),
          rowId: e.rowId,
          columnId: e.columnId,
          from: rowsById.get(e.rowId)?.[e.columnId] ?? null,
          to: e.to,
          rationale: e.rationale,
          decision: 'pending',
        })),
      };
      set((s) => ({ proposals: [...s.proposals, proposal] }));
      return proposal;
    },

    decideEdit: (proposalId, editId, decision) => {
      const proposal = get().proposals.find((p) => p.id === proposalId);
      const edit = proposal?.edits.find((e) => e.id === editId);
      if (!proposal || !edit || edit.decision !== 'pending') return;
      if (decision === 'accepted') get().setCell(edit.rowId, edit.columnId, edit.to, 'agent');
      set((s) => ({
        proposals: s.proposals.map((p) =>
          p.id !== proposalId ? p : { ...p, edits: p.edits.map((e) => (e.id === editId ? { ...e, decision } : e)) },
        ),
      }));
      get().appendLog({ kind: 'human', summary: `You ${decision} ${edit.columnId} → "${edit.to}" on ${edit.rowId}` });
    },

    decideAll: (proposalId, decision) => {
      const proposal = get().proposals.find((p) => p.id === proposalId);
      if (!proposal) return;
      const pending = proposal.edits.filter((e) => e.decision === 'pending');
      if (decision === 'accepted') {
        set((s) => {
          const rows = s.rows.map((r) => {
            const mine = pending.filter((e) => e.rowId === r.id);
            if (mine.length === 0) return r;
            const next = { ...r };
            for (const e of mine) (next as Record<string, unknown>)[e.columnId] = e.to;
            return next;
          });
          return { rows };
        });
      }
      set((s) => ({
        proposals: s.proposals.map((p) =>
          p.id !== proposalId ? p : { ...p, edits: p.edits.map((e) => (e.decision === 'pending' ? { ...e, decision } : e)) },
        ),
      }));
      get().appendLog({ kind: 'human', summary: `You ${decision} ${pending.length} remaining edits in "${proposal.label}"` });
    },

    setControl: (c) => set({ control: c }),

    openControlRequest: (r) => {
      const id = nextId('ctl');
      set({ controlRequest: { id, ...r } });
      return id;
    },

    resolveControlRequest: (id, granted) => {
      const req = get().controlRequest;
      if (!req || req.id !== id) return;
      set({ controlRequest: null, control: granted ? 'agent' : get().control });
      req.resolve(granted);
      get().appendLog({ kind: 'human', summary: granted ? 'You granted ChatGPT direct edit control' : 'You kept reviewing: control request declined' });
    },

    appendLog: (e) => set((s) => ({ log: [...s.log.slice(-499), { id: nextId('log'), at: Date.now(), ...e }] })),

    setSupported: (supported) => set({ supported }),

    reset: () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      set({ rows: seedRows(), proposals: [], log: [], agent: null, humanSelection: [], editing: null, control: 'shared', view: { filter: null, sortBy: null, groupBy: null, rowIds: null, preset: 'all' } });
      get().appendLog({ kind: 'system', summary: 'Workspace reset to the original 187 rows' });
    },
  })),
);

// Persist the durable slice only. Presence, control and selection are ephemeral.
useStore.subscribe(
  (s) => [s.rows, s.proposals, s.log] as const,
  () => save(useStore.getState()),
);

/* ─────────────────────────── selectors ─────────────────────────── */

export function visibleRows(s: Pick<State, 'rows' | 'view'>): Row[] {
  const only = s.view.rowIds ? new Set(s.view.rowIds) : null;
  return sortRows(s.rows.filter((r) => (only ? only.has(r.id) : matchesFilter(r, s.view.filter))), s.view.sortBy);
}

export function untaggedCount(rows: Row[]): number {
  return rows.filter((r) => r.area === null || r.severity === null).length;
}

/** Pending proposed edit for a cell, if any — drives the inline diff rendering. */
export function pendingEditFor(proposals: Proposal[], rowId: string, columnId: string): { proposal: Proposal; edit: ProposedEdit } | null {
  for (let i = proposals.length - 1; i >= 0; i--) {
    const p = proposals[i];
    const e = p.edits.find((x) => x.rowId === rowId && x.columnId === columnId && x.decision === 'pending');
    if (e) return { proposal: p, edit: e };
  }
  return null;
}
