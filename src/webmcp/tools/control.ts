import { useStore } from '../../store/useStore';
import { fail, ok } from '../support';
import { type ToolDef } from './types';

const REQUEST_TIMEOUT_MS = 60_000;

export const request_control: ToolDef = {
  name: 'request_control',
  description:
    'Asks the human for permission to apply a batch of edits directly, without individual review. The human sees a dialog and decides; this call waits for their answer. Use it for large, low-risk batches where per-edit review would be tedious. While you hold control, propose_edits applies immediately.',
  inputSchema: {
    type: 'object',
    properties: {
      reason: { type: 'string', description: 'Why you want direct control, in one sentence. Shown to the human.' },
      estimatedEdits: { type: 'number', description: 'How many edits you intend to apply.' },
    },
    required: ['reason', 'estimatedEdits'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  // Chrome 152 passes no options object when a tool is executed via executeTool();
  // read the signal defensively.
  execute: async (raw, options) => {
    const signal = options?.signal;
    const { reason, estimatedEdits } = raw as { reason: string; estimatedEdits: number };
    const s = useStore.getState();
    if (s.control === 'human') return fail('The human is editing right now. Ask again once they are idle.', { retryAfter: 'human_idle' });
    if (s.control === 'agent') return ok('You already hold control.');
    if (s.controlRequest) return fail('A control request is already waiting for the human.');

    // Elicitation: resolve only on a human click, a timeout, or cancellation.
    const granted = await new Promise<boolean>((resolve) => {
      const id = s.openControlRequest({ reason: String(reason).slice(0, 200), estimatedEdits: Math.max(0, Math.floor(Number(estimatedEdits) || 0)), resolve });
      const timer = setTimeout(() => useStore.getState().resolveControlRequest(id, false), REQUEST_TIMEOUT_MS);
      signal?.addEventListener('abort', () => { clearTimeout(timer); useStore.getState().resolveControlRequest(id, false); }, { once: true });
    });

    return granted
      ? ok('Control granted. propose_edits now applies directly until you call hand_back.', { control: 'agent' })
      : fail('Control declined. Keep using propose_edits so the human can review each change.', { control: useStore.getState().control });
  },
};

export const hand_back: ToolDef = {
  name: 'hand_back',
  description: 'Returns edit control to the human and records a summary of what you did while you held it.',
  inputSchema: {
    type: 'object',
    properties: { summary: { type: 'string', description: 'One or two sentences on what changed.' } },
    required: ['summary'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: async (raw) => {
    const { summary } = raw as { summary: string };
    const s = useStore.getState();
    if (s.control !== 'agent') return fail('You do not hold control.');
    s.setControl('shared');
    s.appendLog({ kind: 'system', summary: `ChatGPT handed control back: ${String(summary).slice(0, 200)}` });
    return ok('Control returned to the human.', { control: 'shared' });
  },
};
