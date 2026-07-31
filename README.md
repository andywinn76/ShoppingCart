# My Shop

A stand-alone e-commerce app built with **Next.js (Pages Router)**, **Tailwind CSS**, **Supabase**, **NextAuth**, **Stripe**, **Cloudinary**, and **Resend**.

Features

- Customer storefront with search, category filters, guest checkout, product reviews, and social share buttons.
- User accounts with order history and saved addresses (email + password via NextAuth; Google login optional).
- Cart that persists across reloads in `localStorage`.
- Stripe Checkout with Stripe Tax, shipping (flat rate + free-over-threshold), and webhook-driven order fulfillment.
- Mixed catalog: physical products with variants (size/color/etc.) and digital downloads in the same store.
- Admin dashboard: product CRUD, photo management (Cloudinary widget), variant + inventory editor, and order list.
- Transactional order-confirmation emails via Resend.

---

## 1. Prerequisites

- **Node.js 18+** and **npm**
- A free **Supabase** account: https://app.supabase.com
- A free **Stripe** account (use test mode): https://dashboard.stripe.com
- A free **Cloudinary** account: https://cloudinary.com
- A **Resend** account (optional for transactional email): https://resend.com

You can do every step below in test mode without spending anything until you're ready to go live.

---

## 2. Install dependencies

```bash
cd "Shopping Cart App"
npm install
```

---

## 3. Set up Supabase

1. Create a new project at https://app.supabase.com.
2. Once it's ready, go to **SQL Editor** and click **+ New query**.
3. Open `supabase/schema.sql` from this repo, paste the entire contents into the editor, and click **Run**.
4. Go to **Project Settings -> API** and copy:
   - Project URL  ->  `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key  ->  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key  ->  `SUPABASE_SERVICE_ROLE_KEY`
     (**Keep this one secret -- never expose it in the browser.**)

### Make yourself an admin

After you register your first account through the site (`/auth/register`), set the admin flag in the Supabase SQL editor:

```sql
update profiles set is_admin = true where email = 'you@example.com';
```

Sign out and back in -- you'll now see an **Admin** link in the header.

---

## 4. Set up Stripe

1. Go to https://dashboard.stripe.com/apikeys (make sure **Test mode** is on -- toggle in the upper right).
2. Copy the **Publishable key** (`pk_test_...`) -> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Copy the **Secret key** (`sk_test_...`) -> `STRIPE_SECRET_KEY`.
4. Go to **Settings -> Tax** and **Activate Stripe Tax**. Add the regions you ship to. (Free during test mode; small fee in production.)

### Webhook (local development)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

It will print a `whsec_...` secret. Copy it into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Webhook (production)

In the Stripe dashboard -> **Developers -> Webhooks -> Add endpoint**:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`
- Copy the signing secret and set `STRIPE_WEBHOOK_SECRET` in your hosting environment.

---

## 5. Set up Cloudinary

1. Sign up at https://cloudinary.com. Your **Cloud Name**, **API Key**, and **API Secret** are on the dashboard.
2. Create an unsigned upload preset:
   - **Settings -> Upload -> Add upload preset**
   - Signing Mode: **Unsigned**
   - Folder (optional): `my-shop`
   - Save and copy the preset name into `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

---

## 6. Set up Resend (optional)

1. Sign up at https://resend.com.
2. Verify a sending domain (or use the sandbox `onboarding@resend.dev` while testing).
3. Create an **API key** -> `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to your verified sender, e.g. `orders@yourdomain.com`.

If you skip Resend, the app still works; the webhook just logs a warning instead of sending email.

---

## 7. Create `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value from the steps above. Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

---

## 8. Run the dev server

In one terminal:

```bash
npm run dev
```

In a second terminal (for Stripe webhooks):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Open http://localhost:3000.

---

## 9. End-to-end test

1. Register at `/auth/register`.
2. Promote yourself to admin in the Supabase SQL editor (step 3 above).
3. Sign back in. Go to **Admin -> Products -> + New product**.
4. Add a name, price, and create the product. On the edit page, upload photos and adjust the **default** variant's inventory.
5. Mark the product **Active** and save.
6. Back on the storefront, add it to your cart and check out using Stripe's test card **4242 4242 4242 4242**, any future expiry, any CVC.
7. Watch your `stripe listen` terminal for the `checkout.session.completed` event -- the order should appear under **Admin -> Orders** as `paid`.

---

## 10. Deploy

The app deploys cleanly to **Vercel**:

1. Push the repo to GitHub.
2. Import into Vercel.
3. Set every env var from `.env.example` in **Project Settings -> Environment Variables**.
4. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to your production URL.
5. Add the production Stripe webhook (step 4 above).

---

## Project layout

```
src/
  pages/             Next.js Pages Router
    index.js         Home
    products/        Catalog + product detail
    search.js
    cart.js
    checkout/        success + cancel
    account/         Customer account area
    auth/            Sign in / register
    admin/           Admin-only dashboard
    api/             API routes
      auth/[...nextauth].js
      register.js
      checkout/session.js
      webhooks/stripe.js
      account/{addresses,profile}.js
      admin/products/...
      admin/variants/[id].js
  components/        UI building blocks
  context/           CartContext (localStorage-backed)
  lib/               Server/client helpers for each service
  styles/            globals.css (Tailwind)
supabase/
  schema.sql         Run this in Supabase SQL editor
```

---

## Where to go next

- **More payment options**: Stripe already supports Apple Pay / Google Pay through Checkout. To add **PayPal**, integrate `@paypal/react-paypal-js` and add a parallel webhook handler.
- **Carrier shipping rates**: replace `lib/shipping.js` with a Shippo or EasyPost integration.
- **Customer reviews**: a `POST /api/reviews` route is the next obvious add; the schema and product page UI already support it.
- **Email templates**: swap the plain-text body in `lib/resend.js` for a React Email template.
- **Internationalization / multi-currency**: each `products.currency` already exists; build a switcher and pass currency through to Stripe per cart.


## STRIPE DEVELOPMENT REMINDERS:
During development to start local Stripe server, in bash enter the following commands:
- stripe login
- stripe listen --forward-to localhost:3000/api/webhooks/stripe