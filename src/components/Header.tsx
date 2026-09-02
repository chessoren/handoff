import { RotateCcw } from 'lucide-react';
import { untaggedCount, useStore } from '../store/useStore';

export function Header() {
  const rows = useStore((s) => s.rows);
  const control = useStore((s) => s.control);
  const agent = useStore((s) => s.agent);
  const supported = useStore((s) => s.supported);
  const reset = useStore((s) => s.reset);
  const untagged = untaggedCount(rows);

  const agentStatus = !supported
    ? 'not connected'
    : control === 'agent'
      ? 'holds control'
      : agent
        ? agent.reason
        : 'idle';

  return (
    <header className="flex h-14 shrink-0 items-center gap-6 border-b border-rule bg-surface px-5">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Handoff</h1>
        <span className="hidden text-[12px] text-ink-muted md:inline">Ledgerly · customer feedback · week 36</span>
      </div>
      <p className="whitespace-nowrap text-[13px] text-ink-muted tabular-nums">
        {rows.length} rows · <span className={untagged > 0 ? 'text-ink' : ''}>{untagged} untagged</span>
      </p>
      <div className="ml-auto flex items-center gap-4">
        <ul className="flex items-center gap-4 text-[13px]" aria-label="Who is in this workspace">
          <li className="flex items-center gap-2">
            <span aria-hidden className={`size-2.5 rounded-full bg-human ${control === 'human' ? 'ring-4 ring-human/15' : ''}`} />
            <span className="font-medium">You</span>
            {control === 'human' && <span className="text-ink-muted">editing</span>}
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className={`size-2.5 rounded-full ${supported ? 'bg-agent' : 'bg-rule'} ${control === 'agent' ? 'ring-4 ring-agent/15' : ''}`} />
            <span className="font-medium">ChatGPT</span>
            <span className="max-w-[220px] truncate text-ink-muted">{agentStatus}</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => { if (window.confirm('Reset the workspace to the original 187 rows? Proposals and the activity log are cleared.')) reset(); }}
          className="flex h-8 items-center gap-1.5 rounded-md border border-rule bg-surface px-2.5 text-[12px] text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-human"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          <span className="whitespace-nowrap">Reset<span className="hidden md:inline"> workspace</span></span>
        </button>
      </div>
    </header>
  );
}
