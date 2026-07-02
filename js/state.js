// Tiny in-memory cache so pages don't all re-fetch on every hash change.
// Invalidated after any write (addEntry, deleteEntry, saveSettings).
const state = {
  entries: null,
  settings: null,
  dashboard: null,
};

function invalidateEntries() {
  state.entries = null;
  state.dashboard = null;
}

function invalidateSettings() {
  state.settings = null;
}

async function getEntriesCached() {
  if (!state.entries) {
    state.entries = await apiGet("getEntries");
  }
  return state.entries;
}

async function getSettingsCached() {
  if (!state.settings) {
    state.settings = await apiGet("getSettings");
  }
  return state.settings;
}

async function getDashboardCached() {
  if (!state.dashboard) {
    state.dashboard = await apiGet("getDashboardData");
  }
  return state.dashboard;
}

function showToast(message, type) {
  type = type || "info";
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("toast-visible"), 10);
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
