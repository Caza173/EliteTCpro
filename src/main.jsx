import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
// cache-bust: 2026-05-20

// Suppress benign ResizeObserver browser notification errors
const _origError = window.onerror;
window.onerror = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('ResizeObserver')) return true;
  return _origError ? _origError(msg, ...args) : false;
};
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

// Suppress ServiceWorker installation errors in preview/sandbox environments
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason || '');
  if (msg.includes('ServiceWorker') || msg.includes('service-worker') || msg.includes('sw.js')) {
    e.preventDefault();
  }
}, true);
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('ServiceWorker') || msg.includes('sw.js')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)