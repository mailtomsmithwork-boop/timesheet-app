async function renderSettings(app) {
  const settings = await getSettingsCached();

  app.innerHTML = `
    <h1>Settings</h1>
    <p class="hint">Add or edit key/value settings. The backend API URL is not editable here — it lives in js/config.js.</p>
    <div id="settingsRows" class="settings-rows"></div>
    <div class="form-actions">
      <button type="button" id="addRowBtn" class="btn btn-secondary">+ Add Setting</button>
      <button type="button" id="saveSettingsBtn" class="btn btn-primary">Save Settings</button>
    </div>
  `;

  const rowsContainer = document.getElementById("settingsRows");

  function addRow(key, value) {
    const row = document.createElement("div");
    row.className = "settings-row";
    row.innerHTML = `
      <input type="text" class="input setting-key" placeholder="Key" value="${key || ""}" />
      <input type="text" class="input setting-value" placeholder="Value" value="${value || ""}" />
      <button type="button" class="btn btn-icon remove-row" aria-label="Remove">×</button>
    `;
    row.querySelector(".remove-row").addEventListener("click", () => row.remove());
    rowsContainer.appendChild(row);
  }

  const keys = Object.keys(settings);
  if (keys.length === 0) {
    addRow("", "");
  } else {
    keys.forEach((k) => addRow(k, settings[k]));
  }

  document.getElementById("addRowBtn").addEventListener("click", () => addRow("", ""));

  document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
    const params = {};
    rowsContainer.querySelectorAll(".settings-row").forEach((row) => {
      const key = row.querySelector(".setting-key").value.trim();
      const value = row.querySelector(".setting-value").value;
      if (key) params[key] = value;
    });

    try {
      await apiGet("saveSettings", params);
      invalidateSettings();
      showToast("Settings saved.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}
