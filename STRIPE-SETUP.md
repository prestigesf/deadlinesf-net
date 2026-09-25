# Stripe Webhooks — Installation Guide (DeadlineSF)

The site now ships a complete, production-shaped webhook handler at
`netlify/functions/stripe-webhook.js`. Follow these steps once, in order.

## 1. Install dependencies

```bash
cd netlify/functions
npm install        # installs the `stripe` package
```

## 2. Set environment variables

Netlify UI → **Site settings → Environment variables**:

| Variable | Value | Where it comes from |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...` while testing) | Stripe Dashboard → Developers → API keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Same page (used by checkout.html to init Stripe.js) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Created in step 3 — **not** your API key |
| `SITE_URL` | `https://deadlinesf.net` | Used for the checkout return URL |
| `FULFILL_EMAIL` | `nicholle@deadlinesf.com` | Optional fulfilment notifications |
| `FULFILL_SHARED_SECRET` | any long random string | Protects `/api/fulfill` |
| `PRICE_GAP_750` … `PRICE_MCP_SHIELD_2500` | `price_...` IDs | One per package — create in Stripe → Products |

Price env vars expected by `create-checkout.js`:
`PRICE_GAP_750`, `PRICE_TIER1_3500`, `PRICE_TIER2_7500`, `PRICE_TIER3_12500`,
`PRICE_MONITOR_500` (recurring), `PRICE_MONITOR_1500` (recurring),
`PRICE_MCP_SHIELD_2500` (recurring).

**Never** put amounts in the browser. Prices live server-side only — that's
why checkout.html sends just the package key.

## 3. Create the webhook in Stripe

Stripe Dashboard → **Developers → Webhooks → Add endpoint**:

- **URL:** `https://deadlinesf.net/api/stripe-webhook`
- **Events to send:**
  - `checkout.session.completed`  ← fulfilment trigger (required)
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`  ← cancel monitoring
  - `invoice.payment_failed`

After saving, click the endpoint → **Reveal signing secret** → paste it into
`STRIPE_WEBHOOK_SECRET` on Netlify, then redeploy (env vars apply on next deploy).

## 4. Test it

```bash
# With the Stripe CLI, forwarding to your local Netlify dev server:
stripe listen --forward-to localhost:8888/api/stripe-webhook
stripe trigger checkout.session.completed
```

Or from the Dashboard: Webhooks → your endpoint → **Send test webhook**.
Watch **Netlify → Functions → stripe-webhook → Logs** for the
`"fulfilment":"new_order"` JSON line.

## 5. How the handler is built (what "properly" means)

- **Signature verification against the raw body** — `stripe.webhooks.constructEvent()`
  with the exact payload Stripe sent. Parsed JSON is never trusted. Bad
  signatures get a 400 and are dropped.
- **Fast 200 on success** — Stripe retries any non-2xx for up to 3 days; the
  handler only returns 500 when it genuinely wants a retry.
- **Idempotency** — Stripe can deliver the same event twice. A dedupe set is
  included; swap the `isProcessed/markProcessed` helpers for Netlify Blobs,
  Redis, or Postgres before real volume.
- **Fulfilment hooks are marked `TODO`** — where to send the email, create the
  client vault, and unlock paid findings (`/api/fulfill`).

## 6. Common failure modes (and their fixes)

| Symptom | Cause | Fix |
|---|---|---|
| 400 "Webhook misconfigured" | `STRIPE_WEBHOOK_SECRET` unset | Set env var, redeploy |
| 400 "signature verification failed" | Wrong secret, or body was mutated before verification | Use the endpoint's own `whsec_...`; never `JSON.parse` before verifying |
| Checkout page shows "Could not start checkout" | Missing `PRICE_*` env var | Create the Price in Stripe, set the env var |
| Webhook fires but nothing happens | TODO fulfilment hooks not wired | Add your email/vault/CRM calls in `stripe-webhook.js` |
