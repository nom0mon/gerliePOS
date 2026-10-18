import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { seedIfEmpty } from './db/seed';
import { importLegacyDexieData } from './db/importLegacy';
import './index.css';

// Migrate any existing legacy Dexie data into RxDB (once), then seed the sample
// menu only if the store is still empty. Order matters: import first so a
// returning user keeps their data and doesn't get the sample menu on top.
void importLegacyDexieData().then(() => seedIfEmpty());

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
