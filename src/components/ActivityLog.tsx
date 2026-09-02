import { ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { hms } from '../lib/time';
import { useStore, type LogEntry } from '../store/useStore';

const DOT: Record<LogEntry['kind'], string> = {
  call: 'bg-agent',
  result: 'bg-agent/40',
  blocked: 'bg-ink',
  register: 'bg-ink-muted/50',
  unregister: 'bg-ink-muted/50',
  human: 'bg-human',
  system: 'bg-rule',
};

export function ActivityLog() {
  const log = useStore((s) => s.log);
  const supported = useStore((s) => s.supported);
  const endRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [log.length]);

  return (
    <section aria-label="Activity" className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline justify-between px-4 pb-1.5 pt-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Activity</h2>
        <span className="font-mono text-[11px] tabular-nums text-ink-muted">{log.length}</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-live="polite">
        {log.length === 0 && (
          <li className="px-2 pt-2 text-[12px] leading-5 text-ink-muted">
            {supported ? 'No agent activity yet. Ask ChatGPT to look at your untagged rows.' : 'Waiting for a WebMCP-capable browser. Your own edits will show here.'}
          </li>
        )}
        {log.map((e) => {
          const open = openId === e.id;
          const hasDetail = e.detail !== undefined;
          return (
            <li key={e.id} className="rounded-md px-2 py-1 text-[12px] leading-4 hover:bg-surface">
              <button
                type="button"
                disabled={!hasDetail}
                onClick={() => setOpenId(open ? null : e.id)}
                aria-expanded={hasDetail ? open : undefined}
                className="flex w-full items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-human disabled:cursor-default"
              >
                <span className="w-[52px] shrink-0 pt-px font-mono text-[11px] tabular-nums text-ink-muted">{hms(e.at)}</span>
                <span aria-hidden className={`mt-1.5 size-1.5 shrink-0 rounded-full ${DOT[e.kind]}`} />
                <span className="min-w-0 flex-1">
                  {e.tool && <span className={`font-mono ${e.kind === 'blocked' ? 'text-ink' : e.kind === 'call' || e.kind === 'result' ? 'text-agent' : 'text-ink-muted'}`}>{e.tool}</span>}
                  {e.tool && ' '}
                  <span className={e.kind === 'blocked' ? 'font-medium' : e.kind === 'register' || e.kind === 'unregister' || e.kind === 'system' ? 'text-ink-muted' : ''}>
                    {e.kind === 'call' ? 'called' : e.summary}
                  </span>
                  {e.durationMs !== undefined && <span className="ml-1 font-mono text-[10px] text-ink-muted">{e.durationMs}ms</span>}
                </span>
                {hasDetail && <ChevronRight aria-hidden className={`mt-0.5 size-3 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-90' : ''}`} />}
              </button>
              {open && hasDetail && (
                <pre className="mt-1 max-h-48 overflow-auto rounded bg-surface p-2 font-mono text-[11px] leading-4 text-ink-muted ring-1 ring-rule">{JSON.stringify(e.detail, null, 2)}</pre>
              )}
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>
    </section>
  );
}
