/**
 * POST /api/fulfill — internal fulfilment hook.
 * Called by stripe-webhook.js (or manually) after a paid order to unlock
 * full scan findings / kick off package delivery.
 *
 * Protect this endpoint: set FULFILL_SHARED_SECRET and require the
 * X-DSF-Secret header so the public cannot self-unlock paid findings.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  const secret = process.env.FULFILL_SHARED_SECRET;
  if (secret && event.headers["x-dsf-secret"] !== secret) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  console.log(JSON.stringify({ fulfil: "received", at: new Date().toISOString(), ...body }));

  // TODO: create the client vault, unlock findings, notify attorney routing.
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, received: body })
  };
};
