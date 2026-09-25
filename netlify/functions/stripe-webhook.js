/**
 * DeadlineSF — Stripe webhook handler (Netlify Function)
 * -------------------------------------------------------
 * Endpoint:  /.netlify/functions/stripe-webhook  (public URL: /api/stripe-webhook via netlify.toml redirect)
 *
 * Required environment variables (Netlify UI → Site settings → Environment variables):
 *   STRIPE_SECRET_KEY       sk_live_... (or sk_test_...)
 *   STRIPE_WEBHOOK_SECRET   whsec_...   (from the Stripe dashboard webhook you create — see STRIPE-SETUP.md)
 *   FULFILL_EMAIL           optional — address notified on new paid orders
 *
 * What this does, in order:
 *   1. Rejects anything that isn't POST.
 *   2. Verifies the Stripe-Signature header against the RAW body (never the parsed body).
 *   3. Acknowledges fast (Stripe retries on non-2xx), then processes the event.
 *   4. Handles the events that matter for this site; logs the rest for audit.
 *
 * Idempotency: Stripe may deliver the same event more than once. We keep an
 * in-memory dedupe set as a first line; wire the markProcessed/isProcessed
 * helpers to a real store (Netlify Blobs, Redis, Postgres) for production.
 */

const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-08-27.acacia" // pin your account's API version
});

// --- naive in-memory idempotency (replace with persistent store for production) ---
const seen = new Set();
const isProcessed = (id) => seen.has(id);
const markProcessed = (id) => { seen.add(id); if (seen.size > 5000) seen.delete(seen.values().next().value); };

// Map site package keys -> human-readable fulfilment slugs (mirror of checkout.html catalog)
const PACKAGES = {
  gap_750:         { name: "AB 2013 Gap Audit",              tier: "one_time" },
  tier1_3500:      { name: "Tier 1 Intake + Applicability",  tier: "one_time" },
  tier2_7500:      { name: "Tier 2 Provenance Control",      tier: "one_time" },
  tier3_12500:     { name: "Tier 3 Full Control Plane Rush", tier: "one_time" },
  monitor_500:     { name: "Monitoring Base",                tier: "subscription" },
  monitor_1500:    { name: "Monitoring Pro",                 tier: "subscription" },
  mcp_shield_2500: { name: "MCP Shield & Post-Quantum",      tier: "subscription" }
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    console.error("stripe-webhook: missing signature header or STRIPE_WEBHOOK_SECRET");
    return { statusCode: 400, body: "Webhook misconfigured" };
  }

  // IMPORTANT: verify against the exact raw payload Stripe sent.
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("stripe-webhook: signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (isProcessed(stripeEvent.id)) {
    return { statusCode: 200, body: JSON.stringify({ received: true, duplicate: true }) };
  }

  try {
    switch (stripeEvent.type) {

      // --- money landed: fulfil the package -----------------------------------
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const pkg = (session.metadata && session.metadata.package) || "unknown";
        const info = PACKAGES[pkg] || { name: pkg, tier: "unknown" };
        const email = session.customer_details && session.customer_details.email;

        console.log(JSON.stringify({
          fulfilment: "new_order",
          package: pkg,
          name: info.name,
          email,
          amount_total: session.amount_total,
          currency: session.currency,
          mode: session.mode,
          payment_status: session.payment_status,
          session_id: session.id
        }));

        // TODO: hook your real fulfilment here — e.g.:
        //   await sendFulfillmentEmail(process.env.FULFILL_EMAIL, info, session);
        //   await createVaultFolder(email, pkg);
        //   await postToInternalApi("/api/fulfill", { org_email: email, package: pkg });
        break;
      }

      // --- subscription lifecycle (monitoring / MCP Shield) --------------------
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        console.log(JSON.stringify({
          fulfilment: "subscription_" + stripeEvent.type.split(".").pop(),
          subscription: sub.id,
          status: sub.status,
          customer: sub.customer
        }));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        console.log(JSON.stringify({
          fulfilment: "subscription_cancelled",
          subscription: sub.id,
          customer: sub.customer
        }));
        // TODO: revoke monitoring access / close the control-plane watch on this org.
        break;
      }

      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object;
        console.log(JSON.stringify({
          fulfilment: "payment_failed",
          customer: invoice.customer,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count
        }));
        // TODO: notify customer + pause fulfilment until recovered.
        break;
      }

      default:
        console.log(`stripe-webhook: unhandled event type ${stripeEvent.type}`);
    }

    markProcessed(stripeEvent.id);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };

  } catch (err) {
    console.error("stripe-webhook: handler error:", err);
    // 500 -> Stripe will retry automatically with backoff
    return { statusCode: 500, body: "Handler error" };
  }
};
