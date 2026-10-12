import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { seedIfEmpty } from './db/seed';
import './index.css';

// Populate sample products on first ever launch (no-op if data already exists).
void seedIfEmpty();

// Register the service worker (offline app shell + install). autoUpdate keeps
// the cached shell fresh on reload when a new version is deployed.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
