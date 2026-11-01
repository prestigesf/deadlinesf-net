/**
 * POST /api/scan — illustrative Decision Engine demo.
 * Body: { org_id, law_id, facts: { provides_generative_ai_system, publicly_accessible_in_ca, monthly_visitors }, controls: [] }
 *
 * Three-valued logic: KNOWN applies / KNOWN does not / ESCALATE (missing facts — never silent pass).
 * One finding unlocked free; the rest locked behind the paid fulfilment path.
 * Not legal advice.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const lawId = body.law_id || "sb942";
  const f = body.facts || {};

  if (lawId !== "sb942" && lawId !== "ab2013") {
    return { statusCode: 400, body: JSON.stringify({ error: "Demo engine supports sb942 and ab2013 packs; other packs via Premium engagement." }) };
  }

  const missing = [];
  if (typeof f.provides_generative_ai_system !== "boolean") missing.push("provides_generative_ai_system");
  if (typeof f.publicly_accessible_in_ca !== "boolean") missing.push("publicly_accessible_in_ca");
  if (typeof f.monthly_visitors !== "number") missing.push("monthly_visitors");

  if (missing.length) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: { outcome: "HUMAN_REVIEW", basis: { applicability: "unknown", escalation: "missing_facts", missing } },
        report: { findings: [] },
        disclaimer: "Missing facts escalate — never silent pass. Not legal advice."
      })
    };
  }

  const findings = [];

  if (lawId === "sb942") {
    const covered = f.provides_generative_ai_system && f.publicly_accessible_in_ca &&
      (f.monthly_visitors > 1000000 /* SB 1000 (pending) deletes this floor entirely */);
    findings.push({
      requirement_id: "SB942-LATENT-01", locked: false, severity: "high",
      title: "Latent provenance disclosure in generated image/video/audio",
      citation: "Cal. Bus. & Prof. Code § 22757.1",
      summary: "Covered providers must embed machine-readable provenance data (provider name, system version, timestamp, unique ID) in AI-generated or altered content.",
      remediation: ["Adopt C2PA/content-credential pipeline at generation time", "Log provenance fields per asset for audit"]
    });
    findings.push({
      requirement_id: "SB942-VERIFY-01", locked: true, severity: "high",
      title: "Free public disclosure-verification tool (third-party allowed under SB 1000)",
      citation: "Cal. Bus. & Prof. Code § 22757.2",
      summary: "Users must be able to check whether content came from your system."
    });
    findings.push({
      requirement_id: "SB942-LICENSE-01", locked: true, severity: "medium",
      title: "Licensee enforcement — 72-hour action window (SB 1000)",
      citation: "Cal. Bus. & Prof. Code § 22757.4",
      summary: "Contracts must require licensees to preserve disclosure capability; act within 72 hours of discovered non-compliance."
    });
    findings.push({
      requirement_id: "SB942-PENALTY-01", locked: true, severity: "info",
      title: "Exposure: $5,000 per violation, per day",
      citation: "Cal. Bus. & Prof. Code § 22757.3",
      summary: "Illustrative statutory exposure; AG / city attorney / county counsel enforcement."
    });
    var applicability = covered ? "likely_applies" : "likely_not_covered_yet";
    if (f.monthly_visitors <= 1000000 && f.provides_generative_ai_system && f.publicly_accessible_in_ca) {
      applicability = "escalate_sb1000_pending (threshold deleted on signature — treat as covered)";
    }
  } else {
    // ab2013 — no threshold
    findings.push({
      requirement_id: "AB2013-DISCLOSE-01", locked: false, severity: "high",
      title: "Public training-data documentation (sources, size, rights, PII, synthetic, window)",
      citation: "Cal. Civ. Code § 3111",
      summary: "Any developer (incl. fine-tuners) of a public GenAI system serving Californians must publish training-data documentation. No user threshold.",
      remediation: ["Publish disclosure page with all required fields", "Version it; update on substantial modification"]
    });
    findings.push({
      requirement_id: "AB2013-TRADESECRET-01", locked: true, severity: "medium",
      title: "Trade-secret handling in disclosures",
      citation: "Cal. Civ. Code § 3111",
      summary: "Balance disclosure completeness against protected trade secrets — escalate list to counsel."
    });
    var applicability = (f.provides_generative_ai_system && f.publicly_accessible_in_ca) ? "likely_applies" : "likely_not_covered";
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: {
        outcome: findings.some(x => x.severity === "high") ? "REMEDIATE" : "ALLOW",
        basis: { applicability, confidence: "illustrative_demo", reason_codes: [] }
      },
      report: { findings },
      disclaimer: "Illustrative scan — not legal advice. Full findings unlock with a paid package."
    })
  };
};
