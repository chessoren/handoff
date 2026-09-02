/**
 * The tool registry: a reconciler between the toolset the application state
 * calls for and the toolset the browser currently exposes.
 *
 * Every conditional tool gets its own AbortController. Withdrawing a tool is
 * `controller.abort()`; the browser removes it from getTools() and fires
 * `toolchange`. That is the whole control lock: when the human takes the
 * wheel, the write tools stop existing at the protocol level.
 *
 * Chrome's guidance recommends static registration by default. Handoff is
 * dynamic on purpose: which tools exist *is* the product behaviour.
 */
import { useStore } from '../store/useStore';
import { isWebMCPSupported, modelContext } from './support';
import { hand_back, request_control } from './tools/control';
import { focus_cells, set_view } from './tools/presence';
import { get_column_schema, get_workspace_state, read_rows } from './tools/read';
import { type ToolDef, type ToolName } from './tools/types';
import { annotate, get_proposal_status, propose_edits } from './tools/write';

export const TOOL_DEFS: Record<ToolName, ToolDef> = {
  get_workspace_state,
  get_column_schema,
  read_rows,
  focus_cells,
  set_view,
  propose_edits,
  get_proposal_status,
  annotate,
  request_control,
  hand_back,
};

export const ALWAYS_ON: readonly ToolName[] = ['get_workspace_state', 'get_column_schema', 'read_rows', 'focus_cells', 'set_view'];

/** Which tools should exist, given the application state. */
export function desiredToolset(s: { control: string; proposals: unknown[]; controlRequest: unknown }): Set<ToolName> {
  const set = new Set<ToolName>(ALWAYS_ON);
  if (s.control !== 'human') {
    set.add('propose_edits');
    set.add('annotate');
    set.add('request_control');
  }
  // Keep the pending elicitation alive even if the human starts typing.
  if (s.controlRequest) set.add('request_control');
  if (s.proposals.length > 0) set.add('get_proposal_status');
  if (s.control === 'agent') set.add('hand_back');
  return set;
}

const controllers = new Map<ToolName, AbortController>();
/** Executions currently running per tool. A tool is never aborted mid-flight:
 *  Chrome < 153 would drop the in-flight result, so withdrawal waits. */
const inFlight = new Map<ToolName, number>();
let syncing: Promise<void> | null = null;
let dirty = false;

/** Wrap execute so every call, result and failure lands in the activity log. */
function instrumented(def: ToolDef): ToolDef {
  return {
    ...def,
    execute: async (input, options) => {
      const store = useStore.getState();
      const started = performance.now();
      const name = def.name as ToolName;
      inFlight.set(name, (inFlight.get(name) ?? 0) + 1);
      store.appendLog({ kind: 'call', tool: def.name, summary: `called ${def.name}`, detail: input });
      try {
        const result = (await def.execute(input, options)) as { ok?: boolean; summary?: string; error?: string; retryAfter?: string };
        const ms = Math.round(performance.now() - started);
        if (result && result.ok === false) {
          useStore.getState().appendLog({
            kind: result.retryAfter === 'human_idle' ? 'blocked' : 'result',
            tool: def.name,
            summary: result.retryAfter === 'human_idle' ? 'Blocked — you were editing.' : (result.error ?? 'failed'),
            detail: result,
            durationMs: ms,
          });
        } else {
          useStore.getState().appendLog({ kind: 'result', tool: def.name, summary: result?.summary ?? 'done', detail: result, durationMs: ms });
        }
        return result;
      } catch (err) {
        useStore.getState().appendLog({ kind: 'result', tool: def.name, summary: `threw: ${String(err)}`, durationMs: Math.round(performance.now() - started) });
        throw err;
      } finally {
        inFlight.set(name, (inFlight.get(name) ?? 1) - 1);
        // Let the result reach the agent before any withdrawal this call caused.
        setTimeout(() => { void syncTools(); }, 0);
      }
    },
  };
}

async function reconcile(): Promise<void> {
  const want = desiredToolset(useStore.getState());
  const mc = modelContext();

  const withdrawn: ToolName[] = [];
  for (const [name, ctrl] of controllers) {
    if (want.has(name)) continue;
    if ((inFlight.get(name) ?? 0) > 0) continue; // withdraw once it returns
    ctrl.abort();
    controllers.delete(name);
    withdrawn.push(name);
  }

  const registered: ToolName[] = [];
  for (const name of want) {
    if (controllers.has(name)) continue;
    const ctrl = new AbortController();
    controllers.set(name, ctrl);
    try {
      await mc.registerTool(instrumented(TOOL_DEFS[name]), { signal: ctrl.signal });
      registered.push(name);
    } catch (err) {
      controllers.delete(name);
      useStore.getState().appendLog({ kind: 'system', tool: name, summary: `registerTool failed: ${String(err)}` });
    }
  }

  const log = useStore.getState().appendLog;
  if (withdrawn.length) log({ kind: 'unregister', summary: `withdrawn: ${withdrawn.join(', ')}`, detail: { abort: withdrawn, exposed: registeredToolNames() } });
  if (registered.length) log({ kind: 'register', summary: `registered: ${registered.join(', ')}`, detail: { registerTool: registered, exposed: registeredToolNames() } });
}

/** Serialised: overlapping calls coalesce into one trailing reconcile. */
export function syncTools(): Promise<void> {
  if (!isWebMCPSupported()) return Promise.resolve();
  if (syncing) { dirty = true; return syncing; }
  syncing = (async () => {
    do { dirty = false; await reconcile(); } while (dirty);
  })().finally(() => { syncing = null; });
  return syncing;
}

let started = false;
/** Call once at boot. Subscribes to *shape* changes only, never to data. */
export function startRegistry(): () => void {
  if (started) return () => {};
  started = true;
  const store = useStore.getState();
  store.setSupported(isWebMCPSupported());
  if (!isWebMCPSupported()) return () => { started = false; };
  const unsub = useStore.subscribe(
    (s) => `${s.control}|${s.proposals.length > 0}|${s.controlRequest !== null}`,
    () => { void syncTools(); },
  );
  void syncTools();
  return () => {
    unsub();
    for (const [, c] of controllers) c.abort();
    controllers.clear();
    started = false;
  };
}

export function registeredToolNames(): ToolName[] {
  return [...controllers.keys()];
}
