/**
 * GET /api/laws — list the law packs available on the Decision Engine.
 * Keep in sync with laws.html (the Law Library).
 */
const LAWS = [
  { law_id: "sb942",    short_name: "SB 942",    title: "California AI Transparency Act",        jurisdiction: "California",      status: "operative_2026-08-02" },
  { law_id: "ab2013",   short_name: "AB 2013",   title: "Training-Data Transparency",            jurisdiction: "California",      status: "in_effect" },
  { law_id: "sb1000",   short_name: "SB 1000",   title: "AI Transparency Act Amendments",        jurisdiction: "California",      status: "passed_pending_signature" },
  { law_id: "sb53",     short_name: "SB 53",     title: "Transparency in Frontier AI Act",       jurisdiction: "California",      status: "in_effect" },
  { law_id: "sb1050",   short_name: "SB 1050",   title: "Synthetic Performer Ad Disclosures",    jurisdiction: "California",      status: "effective_2027-01-01" },
  { law_id: "caivo",    short_name: "SB 813+AB 1405", title: "AI Audit Framework (IVO + Registry)", jurisdiction: "California",   status: "phased" },
  { law_id: "euai",     short_name: "EU AI Act", title: "Regulation (EU) 2024/1689",             jurisdiction: "European Union",  status: "phased_application" },
  { law_id: "colorado", short_name: "SB 26-189", title: "Consumer ADMT Law",                     jurisdiction: "Colorado",        status: "effective_2027-01-01" },
  { law_id: "ilhb3773", short_name: "HB 3773",   title: "AI in Employment (IHRA)",               jurisdiction: "Illinois",        status: "in_effect" },
  { law_id: "ilsb315",  short_name: "SB 315",    title: "AI Safety Measures Act",                jurisdiction: "Illinois",        status: "effective_2027-01-01" },
  { law_id: "nyc144",   short_name: "LL 144",    title: "AEDT Bias Audits",                      jurisdiction: "New York City",   status: "in_effect" },
  { law_id: "texas",    short_name: "HB 149",    title: "Texas Responsible AI Governance Act",   jurisdiction: "Texas",           status: "in_effect" },
  { law_id: "utah",     short_name: "SB 149",    title: "Artificial Intelligence Policy Act",    jurisdiction: "Utah",            status: "in_effect" }
];

exports.handler = async () => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  body: JSON.stringify({ laws: LAWS, updated: "2026-09-24" })
});
