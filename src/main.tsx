import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global error overlay: if something throws during module init or rendering,
// show a readable error message instead of a blank page.
function showErrorOverlay(message: string) {
  try {
    let overlay = document.getElementById('error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'error-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        left: '0',
        right: '0',
        top: '0',
        bottom: '0',
        backgroundColor: 'rgba(0,0,0,0.85)',
        color: 'white',
        padding: '2rem',
        zIndex: '99999',
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '14px',
      });
      document.body.appendChild(overlay);
    }
    overlay.innerText = message;
  } catch (e) {
    // ignore
  }
}

window.addEventListener('error', (ev) => {
  showErrorOverlay(`Error: ${ev.message}\n\n${ev.filename}:${ev.lineno}:${ev.colno}`);
});
window.addEventListener('unhandledrejection', (ev) => {
  const reason = (ev.reason && (ev.reason.stack || ev.reason.message)) || String(ev.reason);
  showErrorOverlay(`Unhandled promise rejection:\n\n${reason}`);
});

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root element not found in document');
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (err: any) {
  showErrorOverlay(err && (err.stack || err.message) ? (err.stack || err.message) : String(err));
}
