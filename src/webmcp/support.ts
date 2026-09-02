/**
 * WebMCP support detection and result helpers.
 *
 * The API lives on `document.modelContext` (the `navigator.modelContext`
 * form is deprecated). Tools return plain JSON-serialisable objects: the
 * spec serialises whatever `execute` resolves with, so an object arrives
 * at the agent as clean JSON rather than a double-encoded string.
 */

export function isWebMCPSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    'modelContext' in document &&
    typeof document.modelContext?.registerTool === 'function'
  );
}

/** Some agents implement a subset of the API. Probe each optional member. */
export function webmcpCapabilities() {
  const mc = typeof document !== 'undefined' ? document.modelContext : undefined;
  return {
    registerTool: typeof mc?.registerTool === 'function',
    getTools: typeof mc?.getTools === 'function',
    toolchange: typeof mc?.addEventListener === 'function',
    executeTool: typeof (mc as { executeTool?: unknown } | undefined)?.executeTool === 'function',
  };
}

export function modelContext(): WebMCP.ModelContext {
  const mc = document.modelContext;
  if (!mc) throw new Error('WebMCP is not available in this browser');
  return mc;
}

export type ToolResult = Record<string, unknown>;

/** Successful result. `summary` is a one-line human/agent-readable sentence. */
export function ok(summary: string, data: ToolResult = {}): ToolResult {
  return { ok: true, summary, ...data };
}

/** Failed result with a descriptive reason so the agent can self-correct. */
export function fail(reason: string, data: ToolResult = {}): ToolResult {
  return { ok: false, error: reason, ...data };
}

/** Chrome's guidance suggests ~1.5K characters per tool output. We stay near it. */
export const OUTPUT_TEXT_BUDGET = 1500;

export function clip(text: string, max = 240): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
