import { SAVED_VIEWS, useStore, visibleRows } from '../store/useStore';
import { matchesFilter } from '../lib/filter';

export function ViewsPanel() {
  const rows = useStore((s) => s.rows);
  const view = useStore((s) => s.view);
  const applySavedView = useStore((s) => s.applySavedView);
  const visibleCount = visibleRows({ rows, view }).length;

  return (
    <nav aria-label="Views" className="px-3 pt-4">
      <h2 className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Views</h2>
      <ul className="space-y-px">
        {SAVED_VIEWS.map((sv) => {
          const active = view.preset === sv.id;
          const count = rows.filter((r) => matchesFilter(r, sv.view.filter)).length;
          return (
            <li key={sv.id}>
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => applySavedView(sv.id)}
                className={`flex h-7 w-full items-center justify-between rounded-md px-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-human ${
                  active ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-rule)]' : 'text-ink-muted hover:bg-surface/70 hover:text-ink'
                }`}
              >
                <span>{sv.label}</span>
                <span className="font-mono text-[11px] tabular-nums text-ink-muted">{count}</span>
              </button>
            </li>
          );
        })}
        {(view.preset === 'agent' || view.preset === 'custom' || view.preset === 'review') && (
          <li>
            <span aria-current="true" className="flex h-7 w-full items-center justify-between rounded-md bg-surface px-2 text-[13px] font-medium shadow-[0_0_0_1px_var(--color-rule)]">
              <span className={view.preset === 'agent' ? 'text-agent' : ''}>
                {view.preset === 'agent' ? 'Set by ChatGPT' : view.preset === 'review' ? 'Reviewing proposal' : 'Custom view'}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">{visibleCount}</span>
            </span>
          </li>
        )}
      </ul>
    </nav>
  );
}

/** Compact replacement for the Views sidebar on narrow panes (the ChatGPT browser is often ~700px wide). */
export function ViewsBar() {
  const rows = useStore((s) => s.rows);
  const view = useStore((s) => s.view);
  const applySavedView = useStore((s) => s.applySavedView);
  const custom = view.preset === 'agent' || view.preset === 'custom' || view.preset === 'review';
  return (
    <nav aria-label="Views" className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-rule bg-ground px-2 lg:hidden">
      {SAVED_VIEWS.map((sv) => {
        const active = view.preset === sv.id;
        const count = rows.filter((r) => matchesFilter(r, sv.view.filter)).length;
        return (
          <button
            key={sv.id}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => applySavedView(sv.id)}
            className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-human ${
              active ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-rule)]' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {sv.label}
            <span className="font-mono text-[10px] tabular-nums">{count}</span>
          </button>
        );
      })}
      {custom && (
        <span className={`flex h-6 shrink-0 items-center rounded-full bg-surface px-2.5 text-[12px] font-medium shadow-[0_0_0_1px_var(--color-rule)] ${view.preset === 'agent' ? 'text-agent' : ''}`}>
          {view.preset === 'agent' ? 'Set by ChatGPT' : view.preset === 'review' ? 'Reviewing proposal' : 'Custom view'}
        </span>
      )}
    </nav>
  );
}
