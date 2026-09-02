import { useStore } from '../store/useStore';

export function ProposalBar() {
  const proposals = useStore((s) => s.proposals);
  const view = useStore((s) => s.view);
  const decideAll = useStore((s) => s.decideAll);
  const reviewProposal = useStore((s) => s.reviewProposal);

  const open = proposals.filter((p) => p.edits.some((e) => e.decision === 'pending'));
  if (open.length === 0) return null;
  const p = open[0];
  const pending = p.edits.filter((e) => e.decision === 'pending').length;
  const done = p.edits.length - pending;
  const reviewing = view.preset === 'review';

  return (
    <div role="region" aria-label="Pending proposal" className="flex h-12 shrink-0 items-center gap-4 border-t border-rule bg-surface px-5">
      <span aria-hidden className="size-2.5 rounded-full bg-agent" />
      <p className="text-[13px]">
        <span className="font-medium">ChatGPT proposes {pending} change{pending === 1 ? '' : 's'}</span>
        <span className="text-ink-muted"> · {p.label}</span>
        {done > 0 && <span className="text-ink-muted"> · {done} of {p.edits.length} decided</span>}
        {open.length > 1 && <span className="text-ink-muted"> · {open.length - 1} more waiting</span>}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={() => reviewProposal(reviewing ? null : p.id)} className="h-8 rounded-md border border-rule px-3 text-[13px] hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-human">
          {reviewing ? 'Back to all rows' : 'Review'}
        </button>
        <button type="button" onClick={() => { decideAll(p.id, 'rejected'); if (reviewing) reviewProposal(null); }} className="h-8 rounded-md border border-rule px-3 text-[13px] text-ink-muted hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-human">
          Reject all
        </button>
        <button type="button" onClick={() => { decideAll(p.id, 'accepted'); if (reviewing) reviewProposal(null); }} className="h-8 rounded-md bg-human px-3 text-[13px] font-medium text-white hover:bg-[#193d7d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-human">
          Accept all
        </button>
      </div>
    </div>
  );
}
