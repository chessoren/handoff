import { Eye, Lock, PenLine } from 'lucide-react';
import { useLiveTools } from '../hooks/useLiveTools';

/**
 * Fed by document.modelContext.getTools() and the `toolchange` event.
 * This list is the browser's view of the page, not our state.
 */
export function LiveToolPanel() {
  const { tools, supported, source } = useLiveTools();
  const live = tools.filter((t) => !t.goneAt).length;

  return (
    <section aria-label="Live tools" className="px-3 pt-5">
      <div className="flex items-baseline justify-between px-2 pb-1.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Live tools</h2>
        <span className="font-mono text-[11px] tabular-nums text-ink-muted">{supported ? `${live} exposed` : 'no WebMCP'}</span>
      </div>
      {supported && <p className="px-2 pb-2 text-[11px] leading-4 text-ink-muted">
        {source === 'getTools'
          ? <>From <code className="font-mono">getTools()</code>, refreshed on <code className="font-mono">toolchange</code>.</>
          : <>This agent has no <code className="font-mono">getTools()</code>; showing our own registry.</>}
      </p>}
      {!supported ? (
        <p className="px-2 text-[12px] text-ink-muted">Nothing is registered because this browser has no <code className="font-mono">document.modelContext</code>.</p>
      ) : (
        <ul className="space-y-px" aria-live="polite">
          {tools.map((t) => {
            const gone = !!t.goneAt;
            return (
              <li
                key={t.name}
                title={t.description}
                className={`flex h-6 items-center gap-1.5 rounded px-2 font-mono text-[12px] transition-all duration-300 ${
                  gone ? 'text-ink-muted/60 line-through' : 'text-ink'
                }`}
              >
                {t.readOnly ? (
                  <Eye aria-label="read-only" className="size-3 shrink-0 text-ink-muted" />
                ) : gone ? (
                  <Lock aria-label="withdrawn" className="size-3 shrink-0 text-ink-muted" />
                ) : (
                  <PenLine aria-label="writes" className="size-3 shrink-0 text-agent" />
                )}
                <span className="truncate">{t.name}</span>
                {t.untrusted && !gone && <span className="ml-auto rounded bg-ground px-1 text-[10px] text-ink-muted" title="untrustedContentHint: returns third-party text">untrusted</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
