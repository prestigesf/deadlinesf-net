/**
 * DeadlineSF — create an Embedded Checkout session (Netlify Function)
 * Endpoint: /api/create-checkout
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      sk_live_... / sk_test_...
 *   STRIPE_PUBLISHABLE_KEY pk_live_... / pk_test_...  (returned to the client to init Stripe.js)
 *   SITE_URL               e.g. https://deadlinesf.net (used for the return URL)
 *
 * Prices: use server-side PRICE IDs from env so clients can never tamper with amounts:
 *   PRICE_GAP_750, PRICE_TIER1_3500, PRICE_TIER2_7500, PRICE_TIER3_12500,
 *   PRICE_MONITOR_500, PRICE_MONITOR_1500, PRICE_MCP_SHIELD_2500
 */

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const CATALOG = {
  gap_750:         { priceEnv: "PRICE_GAP_750",         mode: "payment" },
  tier1_3500:      { priceEnv: "PRICE_TIER1_3500",      mode: "payment" },
  tier2_7500:      { priceEnv: "PRICE_TIER2_7500",      mode: "payment" },
  tier3_12500:     { priceEnv: "PRICE_TIER3_12500",     mode: "payment" },
  monitor_500:     { priceEnv: "PRICE_MONITOR_500",     mode: "subscription" },
  monitor_1500:    { priceEnv: "PRICE_MONITOR_1500",    mode: "subscription" },
  mcp_shield_2500: { priceEnv: "PRICE_MCP_SHIELD_2500", mode: "subscription" }
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const pkg = body.package;
  const item = CATALOG[pkg];
  if (!item) {
    return { statusCode: 400, body: JSON.stringify({ error: "Unknown package", package: pkg }) };
  }

  const price = process.env[item.priceEnv];
  if (!price) {
    return { statusCode: 500, body: JSON.stringify({
      error: `Price not configured: set ${item.priceEnv} in Netlify env vars (see STRIPE-SETUP.md, step 2)`
    }) };
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({
      error: "Stripe keys not configured: set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in Netlify env vars (see STRIPE-SETUP.md, step 2)"
    }) };
  }

  const site = (process.env.SITE_URL || "https://deadlinesf.net").replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: item.mode,
      line_items: [{ price, quantity: 1 }],
      customer_email: body.customer_email || undefined,
      metadata: { package: pkg },
      return_url: `${site}/thanks.html?session_id={CHECKOUT_SESSION_ID}&pkg=${encodeURIComponent(pkg)}`
    });

    const mode = (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live") ? "live" : "test";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientSecret: session.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        mode
      })
    };
  } catch (err) {
    console.error("create-checkout error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
