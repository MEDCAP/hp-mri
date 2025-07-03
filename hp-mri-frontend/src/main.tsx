// src/main.tsx
import { Buffer } from 'buffer';

// Polyfills for Cognito SDK
if (typeof global === 'undefined') {
  (window as any).global = window;
}
if (typeof process === 'undefined') {
  (window as any).process = { env: {} };
}
if (typeof Buffer !== 'undefined') {
  (window as any).Buffer = Buffer;
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
