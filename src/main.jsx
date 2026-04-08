import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Suppress benign ResizeObserver browser notification errors
const _origError = window.onerror;
window.onerror = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('ResizeObserver')) return true;
  return _origError ? _origError(msg, ...args) : false;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)