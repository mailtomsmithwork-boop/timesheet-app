// Tiny in-memory cache so pages don't all re-fetch on every hash change.
// Invalidated after any write (addEntry, deleteEntry, saveSettings).
const state = {
  entries: null,
  settings: null,
  dashboard: null,
  editingEntryId: null, // set by Recordings' Edit button, read by New Entry
};

function startEditingEntry(entryId) {
  state.editingEntryId = entryId;
  window.location.hash = "#/new-entry";
}

function consumeEditingEntryId() {
  const id = state.editingEntryId;
  state.editingEntryId = null;
  return id;
}

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

// options: { actionLabel, onAction, duration }
function showToast(message, type, options) {
  type = type || "info";
  options = options || {};
  const duration = options.duration || (options.onAction ? 7000 : 4000);

  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;

  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  };

  if (options.onAction) {
    const btn = document.createElement("button");
    btn.className = "toast-action";
    btn.textContent = options.actionLabel || "Undo";
    btn.addEventListener("click", () => {
      options.onAction();
      dismiss();
    });
    toast.appendChild(btn);
  }

  container.appendChild(toast);
  setTimeout(() => toast.classList.add("toast-visible"), 10);
  setTimeout(dismiss, duration);
}
