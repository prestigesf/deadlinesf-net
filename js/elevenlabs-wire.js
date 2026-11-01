/**
 * Load ElevenLabs ConvAI widget when an agent id is configured.
 * Sources (first wins): ?agent= query · window.DEADLINESF_ELEVENLABS_AGENT_ID · data-agent-id on #talk
 */
(function () {
  function getAgentId() {
    try {
      var q = new URLSearchParams(window.location.search).get("agent");
      if (q && q.trim()) return q.trim();
    } catch (e) {}
    if (window.DEADLINESF_ELEVENLABS_AGENT_ID && String(window.DEADLINESF_ELEVENLABS_AGENT_ID).trim()) {
      return String(window.DEADLINESF_ELEVENLABS_AGENT_ID).trim();
    }
    var talk = document.getElementById("talk");
    if (talk && talk.getAttribute("data-agent-id")) {
      return talk.getAttribute("data-agent-id").trim();
    }
    return "";
  }

  function mount(agentId) {
    if (document.querySelector("elevenlabs-convai")) return;
    var el = document.createElement("elevenlabs-convai");
    el.setAttribute("agent-id", agentId);
    document.body.appendChild(el);
    if (!document.querySelector('script[src*="convai-widget-embed"]')) {
      var s = document.createElement("script");
      s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      s.async = true;
      document.body.appendChild(s);
    }
  }

  function wireButton(agentId) {
    var btn = document.getElementById("talk");
    if (!btn) return;
    if (!agentId) {
      btn.addEventListener("click", function () {
        alert(
          "ElevenLabs agent script is ready (docs/ElevenLabs-Agent.md). " +
            "Paste your agent-id into /agent-config.js and redeploy, or open this page with ?agent=YOUR_ID"
        );
      });
      return;
    }
    btn.addEventListener("click", function () {
      mount(agentId);
      btn.textContent = "● Concierge loading…";
    });
    // Auto-mount on certificate page so widget is available
    if (document.body && document.body.dataset.autoAgent === "1") {
      mount(agentId);
    }
  }

  function init() {
    wireButton(getAgentId());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
