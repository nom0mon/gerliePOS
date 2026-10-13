**Task:** Build a thermal printer-style digital receipt component.

**Styling & Typography:**
*   **Font:** Use a strictly monospace font (e.g., Courier, Roboto Mono, or 'Courier New') to mimic thermal printing[cite: 3].
*   **Width:** Constrain the maximum width to resemble a standard 80mm thermal receipt roll (approx. 300px - 400px).
*   **Dividers:** Use standard keyboard dashes (`-`) for dashed lines and standard underscores (`_`) or CSS border-bottom for solid lines to separate sections[cite: 3].

**Layout Structure (Top to Bottom):**

1.  **Header (Centered text):**
    *   Small placeholder image/logo at the top[cite: 3].
    *   Store Name: Bold, uppercase, slightly larger text (e.g., "STREET FOOD RESTAURANT")[cite: 3].
    *   Store Address, Contact info (Phone | Email), and Website stacked below[cite: 3].
    *   *Divider: Dashed line*[cite: 3].

2.  **Transaction Metadata (Space-between alignment):**
    *   Row 1: "DATE: [MM/DD/YYYY]" left-aligned, "[HH:MM:SS AM/PM]" right-aligned[cite: 3].
    *   Row 2: "TRN#: [ID]" left-aligned[cite: 3].
    *   Row 3: "SERVER:" left-aligned, "[Name]" right-aligned[cite: 3].
    *   Row 4: "ORDER:" left-aligned, "[Number]" right-aligned[cite: 3].
    *   *Divider: Dashed line*[cite: 3].

3.  **Order Details:**
    *   Header: Center the text `-- ORDER --`[cite: 3].
    *   For each item (Space-between alignment):
        *   Line 1: Item name left-aligned, total item price right-aligned[cite: 3].
        *   Line 2: Indented text showing quantity and unit price (e.g., `1 @ $15.99`) left-aligned[cite: 3].
    *   *Divider: Double dashed line*[cite: 3].

4.  **Totals (Space-between alignment):**
    *   "SUBTOTAL" left, value right[cite: 3].
    *   "TAX [X]%" left, value right[cite: 3].
    *   *Divider: Solid line*[cite: 3].
    *   "**TOTAL**" bold left, "**[Value]**" bold right[cite: 3].
    *   *Divider: Dashed line*[cite: 3].

5.  **Amount in Words:**
    *   "**Amount in Words:**" followed by the spelled-out total in *italics*[cite: 3].
    *   *Divider: Dashed line*[cite: 3].

6.  **Payment Info (Space-between alignment):**
    *   "PAYMENT" left, method (e.g., "CREDIT CARD ****4521") right[cite: 3].
    *   "APPROVAL" left, code right[cite: 3].

7.  **Barcode & Footer (Centered text):**
    *   A barcode image centered, with the TRN# displayed directly beneath it[cite: 3].
    *   *Divider: Dashed line*[cite: 3].
    *   Footer message: "Thank you! We hope to see you again."[cite: 3].