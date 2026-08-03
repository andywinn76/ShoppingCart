# Shopping Cart App — Feature To-Do List

_Last updated: August 3, 2026_

Legend: ⬜ Not started · 🟨 Partially done · ✅ Done

---

## 🔴 High Priority

### 1. Admin — Delete Order Button
**Status:** ✅ Done — `DELETE /api/admin/orders/[id]` guards on status (requires `?force=true` for non-pending/cancelled), `admin/orders.js` has a per-row Delete button with a confirm modal that escalates to a second confirm for paid/fulfilled orders, and removal is optimistic on success. Deletion is logged server-side with admin email + timestamp (console log; not yet a persisted audit table).
**File:** `src/pages/admin/orders.js`  
Add a "Delete" (or "Void") button to each row in the admin orders table so stale `pending` orders or erroneous records can be removed.

- Add a new API route: `src/pages/api/admin/orders/[id].js` (DELETE handler using service role Supabase client)
- Guard the delete to only allow removal of `pending` or `cancelled` orders (require a second confirm for `paid`/`fulfilled`)
- Show a confirmation modal before executing the delete to prevent accidental removal
- On success, refresh the order list in place (optimistic removal or router refresh)
- Log the deletion action with admin email and timestamp for audit purposes

---

### 2. Account — Product Thumbnail in Order History
**Status:** ✅ Done — `account/orders.js` now joins `product:products(product_images(url, alt, sort_order))` per order item, picks the `sort_order = 0` image (or lowest available) server-side in `getServerSideProps`, and strips the rest before sending props to the client. Renders a 48×48 thumbnail via `next/image` with an `FiImage` placeholder icon when no image exists.
**File:** `src/pages/account/orders.js`  
Show the first product image alongside each line item in the order history so users can quickly identify what they ordered.

- Update the Supabase query to join `product_images` via `product_id` on each `order_item`, selecting `url` and `alt` where `sort_order = 0`
- Note: `order_items` already stores `product_id` as a snapshot field — use that for the join
- Render a small `48×48` or `64×64` thumbnail next to each line item using `next/image`
- Fall back gracefully to a neutral placeholder icon if no image is stored
- Keep the image query efficient: select only `url` and `alt`, limit to the first image per product

---

## 🟡 Medium Priority

### 3. Admin — Order Status Update
**Status:** ✅ Done — `PATCH /api/admin/orders/[id]` validates transitions against `ALLOWED_TRANSITIONS` (shared via `src/lib/orderStatus.js` with the admin UI): `pending→paid/cancelled`, `paid→fulfilled/cancelled/refunded`, `fulfilled→refunded`; `cancelled`/`refunded` are terminal. Sets `paid_at`/`fulfilled_at` on those transitions and logs admin email + timestamp. `admin/orders.js` shows an inline "Change to..." dropdown next to the status badge, hidden once an order is terminal.
**File:** `src/pages/admin/orders.js`  
Allow admins to change an order's status directly from the orders table (e.g., `paid` → `fulfilled`, or mark as `cancelled`) without needing a separate page.

- Add an inline dropdown or status-change button per row
- Create/extend the API route `src/pages/api/admin/orders/[id].js` (PATCH handler)
- Validate allowed status transitions server-side

---

### 4. Admin — Order Detail Page
**Status:** ✅ Done — `src/pages/admin/orders/[id].js` shows customer email + shipping/billing address, itemized line items with unit/line totals and order summary, Stripe session/payment-intent IDs, and a Placed/Paid/Fulfilled timeline. Action buttons (Mark Fulfilled, Cancel, Delete) reuse the `ALLOWED_TRANSITIONS`-guarded PATCH/DELETE routes from #1/#3, with the same force-confirm delete modal. Order IDs in `admin/orders.js` now link here.
Create a dedicated order detail view at `src/pages/admin/orders/[id].js` showing:
- Full customer info and shipping address (from `orders.shipping_address` JSONB)
- All line items with quantities, unit prices, and line totals
- Payment details (Stripe session/payment intent IDs)
- Order timeline (created, paid, fulfilled timestamps)
- Action buttons: Mark Fulfilled, Cancel, Delete

---

### 5. Account — Order Detail Page
**Status:** ✅ Done — `src/pages/account/orders/[id].js` shows itemized line items with thumbnails (same sort_order-0 image resolution as #2), an order summary, shipping address, and a Placed → Paid → Fulfilled progress tracker (cancelled/refunded shown as a plain status note instead). The query is scoped by both `id` and the signed-in user's `email` so an order id can't be viewed by guessing the URL. Linked from the order list card in `account/orders.js`.
Create `src/pages/account/orders/[id].js` so customers can view a full receipt including:
- Itemized breakdown with product thumbnails
- Shipping address confirmation
- Order status with a simple progress indicator (Placed → Paid → Fulfilled)
- Link from the existing order list card to this page

---

### 6. Admin — Inventory Alerts
**Status:** ✅ Done — `inventory.js` now has a `StockBadge` ("Out of stock" red / "Low stock" yellow, threshold = 5 units) plus a matching tinted row background, replacing the old plain-text "Low" label. The quantity input is now controlled so edits update the badge/row color immediately, not just after a page reload.
**File:** `src/pages/admin/inventory.js`  
Highlight variants where `inventory <= 0` or below a configurable low-stock threshold (e.g., ≤ 5 units) with a visual badge or row color so restocking needs are immediately visible.

---

## 🟢 Nice to Have

### 7. Admin — Orders CSV Export
**Status:** ✅ Done — `admin/orders.js` has an "Export CSV" button next to the page title that builds a CSV client-side from the currently loaded orders (id, email, status, items, subtotal/shipping/tax/total as plain decimals, currency, created/paid timestamps) and triggers a browser download via a Blob URL. Exports what's currently visible (the latest 100 orders); no separate date-range filter UI yet.
Add an "Export CSV" button to `src/pages/admin/orders.js` that downloads all visible orders (or a filtered date range) as a `.csv` file for use in spreadsheets or accounting tools.

---

### 8. Account — Re-order Button
**Status:** ⬜ Not started
On the account order history page, add a "Buy again" button that pushes all items from a past order back into the cart (checking current inventory/availability first).

---

### 9. Admin — Product Image Reordering
**Status:** ⬜ Not started — `admin/products/[id].js` supports upload/remove but images render in `sort_order` with no reordering UI.
**File:** `src/pages/admin/products/[id].js`  
Allow drag-and-drop reordering of product images so the first image (used as the thumbnail everywhere) can be easily controlled. Currently images are ordered by `sort_order` integer; add a drag UI to update those values.

---

### 10. Customer — Order Confirmation Email Enhancement
**Status:** ⬜ Not started — `resend.js` still sends a plain-text-only email (no HTML, no thumbnails).
**File:** `src/lib/resend.js`  
Include product thumbnails and an itemized line-item table in the order confirmation email so customers have a visual receipt directly in their inbox.

---

### 11. Admin — Bulk Order Actions
**Status:** ⬜ Not started
Add checkboxes to the admin orders table to select multiple orders at once, enabling bulk status updates (e.g., mark 10 orders as fulfilled) or bulk delete of stale pending orders.

---

## 🗄️ Schema / Infrastructure Notes

- The `order_items` table already snapshots `product_id` — the product thumbnail join for feature #2 can be done via a Supabase nested select without schema changes
- The DELETE order API (feature #1) should cascade to `order_items` automatically (already configured with `on delete cascade` in the schema)
- Consider adding a `deleted_at` soft-delete column to `orders` instead of hard-deleting, to preserve audit history while hiding stale records from the UI
