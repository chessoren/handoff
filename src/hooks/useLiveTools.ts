import { useEffect, useState } from 'react';
import { registeredToolNames } from '../webmcp/registry';
import { isWebMCPSupported, modelContext, webmcpCapabilities } from '../webmcp/support';
import { TOOL_DEFS } from '../webmcp/registry';

export interface LiveTool {
  name: string;
  description: string;
  readOnly: boolean;
  untrusted: boolean;
  /** Set when the browser no longer lists the tool; kept briefly for the exit animation. */
  goneAt?: number;
}

/**
 * The browser's own view of our registrations: getTools() re-read on every
 * `toolchange`. Nothing here comes from application state, which is the point.
 */
export function useLiveTools(): { tools: LiveTool[]; supported: boolean; source: 'getTools' | 'registry' } {
  const [tools, setTools] = useState<LiveTool[]>([]);
  const supported = isWebMCPSupported();
  const caps = webmcpCapabilities();
  const source: 'getTools' | 'registry' = caps.getTools ? 'getTools' : 'registry';

  useEffect(() => {
    if (!supported) return;
    const mc = modelContext();
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Fallback for agents without getTools(): mirror our own registry.
    const listTools = async () => {
      if (caps.getTools) {
        try { return await mc.getTools(); } catch { /* fall through */ }
      }
      return registeredToolNames().map((name) => ({ name, description: TOOL_DEFS[name].description, annotations: TOOL_DEFS[name].annotations }));
    };

    const refresh = async () => {
      const list = await listTools();
      if (!alive) return;
      const now = Date.now();
      setTools((prev) => {
        const names = new Set(list.map((t) => t.name));
        const kept = prev
          .filter((t) => !names.has(t.name))
          .map((t) => (t.goneAt ? t : { ...t, goneAt: now }))
          .filter((t) => now - (t.goneAt ?? now) < 1600);
        const fresh = list.map<LiveTool>((t) => ({
          name: t.name,
          description: t.description,
          readOnly: !!t.annotations?.readOnlyHint,
          untrusted: !!t.annotations?.untrustedContentHint,
        }));
        return [...fresh, ...kept].sort((a, b) => a.name.localeCompare(b.name));
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { if (alive) void refresh(); }, caps.toolchange && caps.getTools ? 1700 : 1000);
    };

    void refresh();
    if (caps.toolchange) mc.addEventListener('toolchange', refresh);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (caps.toolchange) mc.removeEventListener('toolchange', refresh);
    };
  }, [supported, caps.getTools, caps.toolchange]);

  return { tools, supported, source };
}
