import { COLUMNS, isColumnId, type ColumnId } from '../../data/schema';
import { type RowFilter, type SortSpec } from '../../lib/filter';
import { useStore, visibleRows } from '../../store/useStore';
import { fail, ok } from '../support';
import { FILTER_SCHEMA, type ToolDef } from './types';

const COLUMN_ENUM = ['source', 'received', 'text', 'area', 'severity', 'status', 'notes'];

export const focus_cells: ToolDef = {
  name: 'focus_cells',
  description:
    'Moves the agent cursor to a set of rows and highlights them in the shared view so the human can see what the agent is looking at. Scrolls them into view. Use this before analysing or proposing changes so your work is visible.',
  inputSchema: {
    type: 'object',
    properties: {
      rowIds: { type: 'array', items: { type: 'string' }, description: 'Row ids such as "fb_012". Up to 60.' },
      columnId: { type: 'string', enum: COLUMN_ENUM, description: 'Column to point at. Optional.' },
      reason: { type: 'string', description: 'A short phrase shown next to the agent cursor, e.g. "checking for duplicate reports".' },
    },
    required: ['rowIds', 'reason'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (raw) => {
    const { rowIds, columnId, reason } = raw as { rowIds: string[]; columnId?: string; reason: string };
    const s = useStore.getState();
    if (!Array.isArray(rowIds) || rowIds.length === 0) return fail('rowIds must contain at least one row id.');
    const known = new Set(s.rows.map((r) => r.id));
    const valid = rowIds.filter((id) => known.has(id)).slice(0, 60);
    const unknown = rowIds.filter((id) => !known.has(id));
    if (valid.length === 0) return fail(`None of the row ids exist. Ids look like "fb_001" to "fb_${String(s.rows.length).padStart(3, '0')}".`, { unknown });
    const col = columnId && isColumnId(columnId) ? (columnId as ColumnId) : null;
    s.setAgentPresence({ rowIds: valid, columnId: col, reason: String(reason).slice(0, 80), at: Date.now() });
    const visibleIds = new Set(visibleRows(s).map((r) => r.id));
    const hidden = valid.filter((id) => !visibleIds.has(id)).length;
    return ok(`Cursor moved to ${valid.length} rows${col ? ` (${col})` : ''}.`, {
      focused: valid.length,
      hiddenByCurrentView: hidden,
      hint: hidden > 0 ? 'Some focused rows are filtered out of the human\'s view. Call set_view to bring them on screen.' : undefined,
      ...(unknown.length ? { unknown } : {}),
    });
  },
};

export const set_view: ToolDef = {
  name: 'set_view',
  description:
    'Changes what the human sees: applies a filter, a sort order, or a grouping to the shared table. Both of you look at the same view, so use this to bring the human to the rows that matter. Omit every field to show all rows.',
  inputSchema: {
    type: 'object',
    properties: {
      filter: FILTER_SCHEMA,
      sortBy: {
        type: 'object',
        properties: {
          columnId: { type: 'string', enum: COLUMN_ENUM },
          direction: { type: 'string', enum: ['asc', 'desc'] },
        },
        required: ['columnId', 'direction'],
      },
      groupBy: { type: 'string', enum: [...COLUMN_ENUM, 'none'], description: 'Group rows under headers by this column.' },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (raw) => {
    const input = raw as { filter?: RowFilter; sortBy?: SortSpec; groupBy?: string };
    const s = useStore.getState();
    if (input.filter && !isColumnId(input.filter.columnId)) {
      return fail(`Unknown filter column "${input.filter.columnId}". Allowed: ${COLUMNS.map((c) => c.id).join(', ')}.`);
    }
    if (input.sortBy && !isColumnId(input.sortBy.columnId)) {
      return fail(`Unknown sort column "${input.sortBy.columnId}".`);
    }
    const groupBy = input.groupBy && input.groupBy !== 'none' && isColumnId(input.groupBy) ? (input.groupBy as ColumnId) : null;
    s.setView({ filter: input.filter ?? null, sortBy: input.sortBy ?? null, groupBy }, 'agent');
    const count = visibleRows(useStore.getState()).length;
    return ok(`View updated. The human now sees ${count} rows.`, { visibleRowCount: count });
  },
};
