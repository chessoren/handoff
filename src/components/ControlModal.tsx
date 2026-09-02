import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export function ControlModal() {
  const req = useStore((s) => s.controlRequest);
  const resolve = useStore((s) => s.resolveControlRequest);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!req) return;
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') resolve(req.id, false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req, resolve]);

  if (!req) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="ctl-title" className="w-full max-w-[440px] rounded-lg border border-rule bg-surface p-5 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-agent" />
          <span className="text-[12px] font-medium text-agent">ChatGPT · request_control</span>
        </div>
        <h2 id="ctl-title" className="text-[15px] font-medium leading-6">
          ChatGPT wants to apply {req.estimatedEdits} edit{req.estimatedEdits === 1 ? '' : 's'} directly, without per-edit review.
        </h2>
        <p className="mt-2 rounded-md bg-ground px-3 py-2 text-[13px] leading-5 text-ink">{req.reason}</p>
        <p className="mt-3 text-[12px] leading-5 text-ink-muted">
          Granting control lets propose_edits write immediately until ChatGPT calls hand_back. You can take the wheel back at any time by editing a cell.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={keepRef} type="button" onClick={() => resolve(req.id, false)} className="h-9 rounded-md border border-rule px-3.5 text-[13px] hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-human">
            Keep reviewing
          </button>
          <button type="button" onClick={() => resolve(req.id, true)} className="h-9 rounded-md bg-agent px-3.5 text-[13px] font-medium text-white hover:bg-[#98124d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agent">
            Grant control
          </button>
        </div>
      </div>
    </div>
  );
}
