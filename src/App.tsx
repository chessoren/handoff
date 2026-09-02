import { useEffect } from 'react';
import { ActivityLog } from './components/ActivityLog';
import { ControlModal } from './components/ControlModal';
import { DataTable } from './components/DataTable';
import { Header } from './components/Header';
import { LiveToolPanel } from './components/LiveToolPanel';
import { ProposalBar } from './components/ProposalBar';
import { UnsupportedBanner } from './components/UnsupportedBanner';
import { ViewsPanel } from './components/ViewsPanel';
import { useStore } from './store/useStore';
import { startRegistry } from './webmcp/registry';

export default function App() {
  const supported = useStore((s) => s.supported);

  // Register tools once. The registry reconciles on state *shape* changes only.
  useEffect(() => startRegistry(), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header />
      {!supported && <UnsupportedBanner />}
      <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)_300px]">
        <aside className="flex min-h-0 flex-col overflow-y-auto border-r border-rule bg-ground">
          <ViewsPanel />
          <LiveToolPanel />
          <p className="mt-auto px-5 pb-4 pt-6 text-[11px] leading-4 text-ink-muted">
            Ten tools on <code className="font-mono">document.modelContext</code>. Write tools withdraw while you edit.
          </p>
        </aside>
        <main className="min-h-0 min-w-0">
          <DataTable />
        </main>
        <aside className="flex min-h-0 flex-col border-l border-rule bg-ground">
          <ActivityLog />
        </aside>
      </div>
      <ProposalBar />
      <ControlModal />
    </div>
  );
}
