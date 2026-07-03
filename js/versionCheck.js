// Installed iOS home-screen apps can resume a stale cached session
// indefinitely (no pull-to-refresh in standalone mode), so this polls
// version.json with cache disabled — a real network request regardless of
// how stale the rest of the page is — and blocks the UI with a forced
// reload prompt when it doesn't match the version this page was built with.
const APP_VERSION = document.querySelector('meta[name="app-version"]').content;

function showUpdateOverlay_() {
  if (document.getElementById("updateOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "updateOverlay";
  overlay.className = "update-overlay";
  overlay.innerHTML = `
    <div class="update-overlay-card">
      <h2>Update Available</h2>
      <p>A newer version of Timesheet is ready.</p>
      <button type="button" id="updateReloadBtn" class="btn btn-primary">Reload</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById("updateReloadBtn").addEventListener("click", () => {
    window.location.href = window.location.origin + window.location.pathname + "?_r=" + Date.now();
  });
}

async function checkAppVersion_() {
  try {
    const res = await fetch("version.json?_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (String(data.version) !== String(APP_VERSION)) {
      showUpdateOverlay_();
    }
  } catch (err) {
    // Offline or request failed — don't block the user over a network hiccup;
    // the status widget already surfaces connectivity separately.
  }
}

checkAppVersion_();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkAppVersion_();
});
