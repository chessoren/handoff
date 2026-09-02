import { COLUMN_BY_ID, isEditableColumn, type EditableColumnId } from '../../data/schema';
import { useStore } from '../../store/useStore';
import { fail, ok } from '../support';
import { type ToolDef } from './types';

const MAX_EDITS = 50;

/** Defence in depth: abort() closes the tool surface, this guard covers the race. */
function humanHoldsWheel() {
  return useStore.getState().control === 'human';
}
const BLOCKED = () =>
  fail('The human is currently editing this workspace. Write tools are unavailable until they finish. You can still read rows and move your cursor.', { retryAfter: 'human_idle' });

interface EditInput { rowId: string; columnId: string; value: string; rationale?: string }

export const propose_edits: ToolDef = {
  name: 'propose_edits',
  description:
    'Proposes a batch of cell edits for the human to review. The edits are shown inline in the table as diffs and are not applied until the human accepts them. Include a short rationale for each edit so the human can judge quickly. Up to 50 edits per call.',
  inputSchema: {
    type: 'object',
    properties: {
      label: { type: 'string', description: 'A one-line summary, e.g. "Tag 34 billing complaints as P1".' },
      edits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rowId: { type: 'string' },
            columnId: { type: 'string', enum: ['area', 'severity', 'status', 'notes'] },
            value: { type: 'string', description: 'For enum columns, one of the allowed values from get_column_schema.' },
            rationale: { type: 'string', description: 'Why, in a few words. Shown to the human next to the diff.' },
          },
          required: ['rowId', 'columnId', 'value'],
        },
      },
    },
    required: ['label', 'edits'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (raw) => {
    if (humanHoldsWheel()) return BLOCKED();
    const { label, edits } = raw as { label: string; edits: EditInput[] };
    const s = useStore.getState();
    if (!Array.isArray(edits) || edits.length === 0) return fail('edits must contain at least one edit.');
    if (edits.length > MAX_EDITS) return fail(`Too many edits (${edits.length}). Send at most ${MAX_EDITS} per call and paginate.`);

    const rowsById = new Map(s.rows.map((r) => [r.id, r]));
    const accepted: { rowId: string; columnId: EditableColumnId; to: string; rationale?: string }[] = [];
    const rejected: { rowId: string; columnId: string; value: string; reason: string }[] = [];

    for (const e of edits) {
      const row = rowsById.get(e.rowId);
      if (!row) { rejected.push({ ...e, reason: `Row "${e.rowId}" does not exist.` }); continue; }
      if (!isEditableColumn(e.columnId)) { rejected.push({ ...e, reason: `"${e.columnId}" is not editable. Editable: area, severity, status, notes.` }); continue; }
      const col = COLUMN_BY_ID[e.columnId];
      const value = String(e.value ?? '').trim();
      if (col.values && !col.values.includes(value)) {
        rejected.push({ ...e, reason: `"${value}" is not a valid ${e.columnId}. Allowed: ${col.values.join(', ')}.` });
        continue;
      }
      if (row[e.columnId] === value) { rejected.push({ ...e, reason: `${e.columnId} is already "${value}".` }); continue; }
      accepted.push({ rowId: e.rowId, columnId: e.columnId, to: value, rationale: e.rationale ? String(e.rationale).slice(0, 160) : undefined });
    }

    if (accepted.length === 0) {
      return fail(`Rejected all ${rejected.length} edits.`, { rejected: rejected.slice(0, 10) });
    }

    // Direct mode: the human granted control, so apply without review.
    if (s.control === 'agent') {
      for (const e of accepted) s.setCell(e.rowId, e.columnId, e.to, 'agent');
      return ok(`Applied ${accepted.length} edits directly (you hold control).`, {
        applied: accepted.length,
        rejected: rejected.length,
        ...(rejected.length ? { rejectedSamples: rejected.slice(0, 5) } : {}),
      });
    }

    const proposal = s.addProposal(String(label).slice(0, 120), accepted);
    return ok(`Proposed ${accepted.length} edits as "${proposal.label}". The human sees them as diffs and decides.`, {
      proposalId: proposal.id,
      proposed: accepted.length,
      rejected: rejected.length,
      ...(rejected.length ? { rejectedSamples: rejected.slice(0, 5) } : {}),
      next: 'Call get_proposal_status with this proposalId to learn what the human accepted and rejected.',
    });
  },
};

export const get_proposal_status: ToolDef = {
  name: 'get_proposal_status',
  description:
    "Reports what the human did with a previous proposal: how many edits were accepted, how many rejected, how many are still pending, and samples of the rejections. Use this to learn the human's preferences before proposing the next batch. Omit proposalId for the most recent proposal.",
  inputSchema: {
    type: 'object',
    properties: { proposalId: { type: 'string', description: 'Id returned by propose_edits. Optional.' } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: async (raw) => {
    const { proposalId } = raw as { proposalId?: string };
    const s = useStore.getState();
    const proposal = proposalId ? s.proposals.find((p) => p.id === proposalId) : s.proposals[s.proposals.length - 1];
    if (!proposal) {
      return fail(proposalId ? `No proposal with id "${proposalId}".` : 'No proposals yet.', {
        known: s.proposals.map((p) => p.id).slice(-5),
      });
    }
    const rowsById = new Map(s.rows.map((r) => [r.id, r]));
    const by = (d: string) => proposal.edits.filter((e) => e.decision === d);
    const rejectedSamples = by('rejected').slice(0, 8).map((e) => ({
      rowId: e.rowId,
      columnId: e.columnId,
      youProposed: e.to,
      currentValue: rowsById.get(e.rowId)?.[e.columnId] ?? null,
      textExcerpt: (rowsById.get(e.rowId)?.text ?? '').slice(0, 120),
    }));
    const pending = by('pending').length;
    return ok(
      `"${proposal.label}": ${by('accepted').length} accepted, ${by('rejected').length} rejected, ${pending} pending.`,
      {
        proposalId: proposal.id,
        label: proposal.label,
        accepted: by('accepted').length,
        rejected: by('rejected').length,
        pending,
        rejectedSamples,
        hint: pending > 0 ? 'The human has not finished reviewing. Wait or ask them.' : undefined,
      },
    );
  },
};

export const annotate: ToolDef = {
  name: 'annotate',
  description:
    'Leaves a short note on a single row. Notes are additive and applied immediately, since they never overwrite existing data. Use it to flag duplicates, ask a question, or explain a judgement.',
  inputSchema: {
    type: 'object',
    properties: {
      rowId: { type: 'string' },
      text: { type: 'string', description: 'Up to 200 characters.' },
    },
    required: ['rowId', 'text'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (raw) => {
    if (humanHoldsWheel()) return BLOCKED();
    const { rowId, text } = raw as { rowId: string; text: string };
    const s = useStore.getState();
    if (!s.rows.some((r) => r.id === rowId)) return fail(`Row "${rowId}" does not exist.`);
    const note = String(text ?? '').trim().slice(0, 200);
    if (!note) return fail('text must not be empty.');
    s.appendNote(rowId, note, 'agent');
    return ok(`Note added to ${rowId}.`, { rowId, note });
  },
};
