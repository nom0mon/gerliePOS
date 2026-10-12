# Mommy POS

A frontend-only, offline-capable Point of Sale app for a single mobile device.
Built with React + Vite + TypeScript, with all data stored locally in the
browser via IndexedDB (Dexie). It installs as a PWA so it launches from the
phone's home screen and the app shell works offline.

## Features

- **Catalog** — list products (name, price, stock, units sold) and add new ones.
- **Checkout** — tap products into a cart, adjust quantities, see a running total.
- **Cash sale** — "Charge (Cash)" records the sale atomically: stock is
  decremented and each product's sold count is incremented in one transaction.
- **Receipt** — a print/share-friendly receipt after each sale.
- **Reports** — daily sales total and transaction count, with a date picker.
- **Offline PWA** — installable, works without a network connection.

All state is managed with focused React Contexts (`CatalogContext`,
`CartContext`, `SalesContext`) composed at the app root. Data access is isolated
in repository modules (`productRepo`, `saleRepo`) that wrap Dexie.

## Requirements

- Node.js 18+ (developed on Node 24).
- A modern browser.

> On Windows PowerShell, if `npm` is blocked by the script execution policy,
> use `npm.cmd` / `npx.cmd` instead of `npm` / `npx`.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL in your browser. On first launch the catalog is
seeded with a few sample products.

## Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the Vite dev server.                    |
| `npm run build`   | Type-check and build the production bundle.   |
| `npm run preview` | Serve the production build locally.           |
| `npm test`        | Run the test suite once (Vitest).             |
| `npm run test:watch` | Run tests in watch mode.                   |

## Install on a phone (PWA)

1. Build and serve the production bundle so the service worker is active:
   ```bash
   npm run build
   npm run preview -- --host
   ```
   `--host` exposes the preview server on your local network so the phone can
   reach it at `http://<your-computer-ip>:<port>`.
2. On the phone, open that URL in the browser.
3. Use the browser's **Add to Home Screen** / **Install app** option.
4. Launch "Mommy POS" from the home screen. After the first load, the app shell
   works offline.

## Data & privacy

- There is no backend and no network sync. Everything lives in this device's
  browser storage (IndexedDB, database name `mommy-pos`).
- Clearing the browser's site data for this app erases all products and sales.

## Project structure

```
src/
  db/            Dexie instance (db.ts) + sample seed
  repositories/  Data access (productRepo, saleRepo) — the only code touching Dexie
  types/         Shared domain types (Product, Sale, SaleItem, PaymentType)
  context/       CatalogContext, CartContext, SalesContext
  pages/         Catalog, Checkout, Receipt, Reports
  components/    Layout, ErrorBoundary
  utils/         money + date helpers
```

## Extending

- **More payment types:** `PaymentType` is an enum (currently `CASH`) and every
  sale stores a `paymentType`. Add new enum members and a payment selector on
  checkout — no schema migration required for the field itself.
- **Schema changes:** bump the Dexie version in `src/db/db.ts` with a new
  `.version(n).stores(...)` block; never edit a shipped version block.
```
