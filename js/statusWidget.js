// Small persistent corner widget showing backend connection status + latency.
// Pings a lightweight action periodically so the indicator stays live even
// when the user isn't actively triggering other API calls.
const STATUS_CHECK_INTERVAL_MS = 30000;

function setStatusWidget_(state, text) {
  const dot = document.getElementById("statusDot");
  const label = document.getElementById("statusText");
  if (!dot || !label) return;
  dot.className = "status-dot status-" + state;
  label.textContent = text;
}

async function checkBackendStatus_() {
  const start = performance.now();
  try {
    await apiGet("getSettings");
    const latencyMs = Math.round(performance.now() - start);
    setStatusWidget_("live", `Live · ${latencyMs}ms`);
  } catch (err) {
    setStatusWidget_("offline", "Offline");
  }
}

checkBackendStatus_();
setInterval(checkBackendStatus_, STATUS_CHECK_INTERVAL_MS);
