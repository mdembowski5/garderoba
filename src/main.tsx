import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { requestPersistentStorage } from './lib/db';
import './index.css';

// iOS Safari: blokada gestu pinch-zoom, który kolidowałby z UI aplikacji.
['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) =>
  document.addEventListener(evt, (e) => e.preventDefault())
);

requestPersistentStorage();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline cache jest opcjonalny */
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
