import { useEffect, useState } from 'react';
import { isWebMCPSupported, modelContext } from '../webmcp/support';

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
export function useLiveTools(): { tools: LiveTool[]; supported: boolean } {
  const [tools, setTools] = useState<LiveTool[]>([]);
  const supported = isWebMCPSupported();

  useEffect(() => {
    if (!supported) return;
    const mc = modelContext();
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      const list = await mc.getTools();
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
      timer = setTimeout(() => { if (alive) void refresh(); }, 1700);
    };

    void refresh();
    mc.addEventListener('toolchange', refresh);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      mc.removeEventListener('toolchange', refresh);
    };
  }, [supported]);

  return { tools, supported };
}
