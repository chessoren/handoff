import { useEffect, useState, type RefObject } from 'react';
import { useStore } from '../store/useStore';

interface Props { scrollRef: RefObject<HTMLDivElement | null> }

/**
 * The agent's cursor: a named pointer that glides to the first focused row.
 * Position is measured from the DOM so it survives sorting, grouping and
 * filtering. The 400ms ease is the only non-human-triggered motion in the app.
 */
export function AgentCursor({ scrollRef }: Props) {
  const agent = useStore((s) => s.agent);
  const view = useStore((s) => s.view);
  const rows = useStore((s) => s.rows);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!agent || !container) { setVisible(false); return; }
    const targetId = agent.rowIds.find((id) => container.querySelector(`[data-row-id="${id}"]`)) ?? null;
    const rowEl = targetId ? container.querySelector<HTMLElement>(`[data-row-id="${targetId}"]`) : null;
    if (!rowEl) { setVisible(false); return; }

    const cellEl = agent.columnId ? rowEl.querySelector<HTMLElement>(`[data-col="${agent.columnId}"]`) : null;
    const anchor = cellEl ?? rowEl;

    const measure = () => {
      const a = anchor.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      setPos({ top: a.top - c.top + container.scrollTop + 6, left: a.left - c.left + container.scrollLeft + (cellEl ? 8 : 12) });
      setVisible(true);
    };

    // Bring the row into view first, then measure so the cursor lands where the row settles.
    rowEl.scrollIntoView({ block: 'center', behavior: 'auto' });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [agent, view, rows, scrollRef]);

  if (!agent || !pos) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-20 transition-[top,left,opacity] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ top: pos.top, left: pos.left }}
    >
      <svg width="14" height="18" viewBox="0 0 14 18" className="drop-shadow-sm">
        <path d="M1 1 L1 14 L4.5 10.8 L7 16.5 L9.6 15.4 L7.1 9.8 L12 9.6 Z" fill="var(--color-agent)" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <div className="absolute left-3 top-4 flex max-w-[320px] items-center gap-1.5 whitespace-nowrap rounded-md bg-agent px-2 py-1 text-[12px] leading-4 text-white shadow-md">
        <span className="font-semibold">ChatGPT</span>
        <span className="truncate opacity-90">· {agent.reason}</span>
      </div>
    </div>
  );
}
