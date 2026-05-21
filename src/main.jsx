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
  if (e.reason && e.reason.message && e.reason.message.includes('ServiceWorker')) {
    e.preventDefault();
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)