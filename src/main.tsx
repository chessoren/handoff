import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// Surface boot-time failures visibly rather than as a blank page.
function showFatal(message: string) {
  const root = document.getElementById('root');
  if (root && root.childElementCount === 0) {
    root.innerHTML = `<pre style="margin:32px;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap">Handoff failed to start\n\n${message.replace(/</g, '&lt;')}\n\n${navigator.userAgent}</pre>`;
  }
}
window.addEventListener('error', (e) => showFatal(String(e.error?.stack ?? e.message)));
window.addEventListener('unhandledrejection', (e) => showFatal(String((e.reason as Error)?.stack ?? e.reason)));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
