# Project Context: [App Name] - Mobile POS

## 1. Core Architecture
- **Environment:** Mobile/Tablet First
- **Primary Users:** Cashiers, Floor Staff, Store Managers
- **Key Metric:** Time-to-checkout (Speed)

## 2. Design Tokens & Styling (Example)
- **Primary Action Color:** `#0066CC` (High contrast blue for 'Pay' / 'Add')
- **Destructive Action Color:** `#D93025` (Red for 'Void' / 'Delete')
- **Typography:** Inter (Headers), Roboto Mono (Pricing/Quantities)
- **Grid System:** 8px base, minimum 44px tap targets for interactive elements.

## 3. UI/UX Non-Negotiables
- **No Hidden Menus for Core Actions:** Search, Barcode Scan, and Quick Tenders must always be visible on the main screen.
- **Visual Hierarchy:** The Cart Total and the "Pay" button are the most important elements. They must be sticky at the bottom or right side of the screen.
- **Error Recovery:** Destructive actions (Clearing the cart) must require confirmation, but non-destructive errors (Item not found) should clear easily with one tap.

## 4. Current Task / Focus Area
[Leave blank to be filled dynamically per session]