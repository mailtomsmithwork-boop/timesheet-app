async function renderArchives(app) {
  app.innerHTML = `
    <div class="page-header-row">
      <h1>Archives</h1>
      <button type="button" id="exportArchiveCsvBtn" class="btn btn-secondary" style="display:none;">Export CSV</button>
    </div>
    <p class="hint">Past months are archived automatically on the 1st — pick a month to view its entries.</p>
    <div class="quick-check-row">
      <label>Month
        <select id="archiveMonth"><option value="">Loading…</option></select>
      </label>
    </div>
    <div id="archiveTableWrap"></div>
  `;

  const monthSelect = document.getElementById("archiveMonth");
  const tableWrap = document.getElementById("archiveTableWrap");
  const exportBtn = document.getElementById("exportArchiveCsvBtn");
  const columns = ["Date", "TimeIn", "TimeOut", "TotalTime", "JobNumber", "Reason", "EntryID"];
  let currentEntries = [];

  let months;
  try {
    months = await apiGet("getArchiveMonths");
  } catch (err) {
    monthSelect.innerHTML = "";
    tableWrap.innerHTML = `<div class="error-panel">${err.message}</div>`;
    return;
  }

  if (months.length === 0) {
    monthSelect.innerHTML = "";
    tableWrap.innerHTML = '<p class="empty-cell">No archived months yet.</p>';
    return;
  }

  monthSelect.innerHTML = months
    .map((m) => `<option value="${m.replace("Archive-", "")}">${m.replace("Archive-", "")}</option>`)
    .join("");

  async function loadMonth(month) {
    tableWrap.innerHTML = '<div class="loading">Loading…</div>';
    exportBtn.style.display = "none";
    try {
      const entries = await apiGet("getArchiveEntries", { month });
      currentEntries = entries;
      if (entries.length === 0) {
        tableWrap.innerHTML = '<p class="empty-cell">No entries in this month’s archive.</p>';
        return;
      }
      exportBtn.style.display = "";
      tableWrap.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
            <tbody>
              ${entries
                .map(
                  (r) => `<tr>${columns.map((c) => `<td>${r[c] !== undefined ? r[c] : ""}</td>`).join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      tableWrap.innerHTML = `<div class="error-panel">${err.message}</div>`;
    }
  }

  exportBtn.addEventListener("click", () => {
    if (currentEntries.length === 0) return;
    downloadCsv(`timesheet-archive-${monthSelect.value}.csv`, columns, currentEntries);
  });

  monthSelect.addEventListener("change", () => loadMonth(monthSelect.value));
  await loadMonth(monthSelect.value);
}
