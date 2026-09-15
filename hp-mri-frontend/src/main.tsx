// src/main.tsx
import { Buffer } from 'buffer';

// Node-style globals the Cognito SDK expects to exist on `window` in the browser.
declare global {
  interface Window {
    global: Window;
    Buffer: typeof Buffer;
  }
}

// Polyfills for Cognito SDK
if (typeof global === 'undefined') {
  window.global = window;
}
if (typeof process === 'undefined') {
  // Object.assign avoids clashing with the Node `Process` type that a dependency
  // merges into Window — the SDK only ever reads `process.env`.
  Object.assign(window, { process: { env: {} } });
}
if (typeof Buffer !== 'undefined') {
  window.Buffer = Buffer;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
