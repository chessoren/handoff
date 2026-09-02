import { AlertTriangle } from 'lucide-react';

export function UnsupportedBanner() {
  return (
    <div role="status" className="flex items-start gap-3 border-b border-rule bg-[#FFF6E5] px-4 py-2.5 text-[13px] leading-5 text-ink">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-[#9A6400]" />
      <p>
        <span className="font-medium">Handoff needs a browser with WebMCP.</span> Open this page in the ChatGPT desktop app's browser, or in Chrome 149+
        with <code className="font-mono text-[12px]">chrome://flags/#enable-webmcp-testing</code> enabled. You can still edit the table by hand; the agent
        seat stays empty.
      </p>
    </div>
  );
}
