async function renderRecordings(app) {
  const entries = await getEntriesCached();

  const columns = ["Date", "TimeIn", "TimeOut", "TotalTime", "JobNumber", "Reason", "EntryID"];
  let sortCol = "Date";
  let sortDir = 1;
  let filterText = "";
  let currentRows = [];

  app.innerHTML = `
    <div class="page-header-row">
      <h1>Recordings</h1>
      <button type="button" id="exportCsvBtn" class="btn btn-secondary">Export CSV</button>
    </div>
    <input type="text" id="filterInput" class="input" placeholder="Filter by job number or reason…" />
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${columns.map((c) => `<th data-col="${c}">${c}</th>`).join("")}<th></th></tr></thead>
        <tbody id="recordingsBody"></tbody>
      </table>
    </div>
  `;

  const filterInput = document.getElementById("filterInput");
  const tbody = document.getElementById("recordingsBody");

  function renderRows() {
    currentRows = entries.filter((r) => {
      if (!filterText) return true;
      const haystack = (String(r.JobNumber) + " " + String(r.Reason)).toLowerCase();
      return haystack.includes(filterText.toLowerCase());
    });
    currentRows = currentRows.slice().sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    if (currentRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="empty-cell">No entries found.</td></tr>`;
      return;
    }

    tbody.innerHTML = currentRows
      .map(
        (r) =>
          `<tr>${columns.map((c) => `<td>${r[c] !== undefined ? r[c] : ""}</td>`).join("")}` +
          `<td><button type="button" class="btn btn-icon edit-row-btn" data-entry-id="${r.EntryID}" title="Edit">✎</button></td></tr>`
      )
      .join("");

    tbody.querySelectorAll(".edit-row-btn").forEach((btn) => {
      btn.addEventListener("click", () => startEditingEntry(btn.getAttribute("data-entry-id")));
    });
  }

  filterInput.addEventListener("input", (e) => {
    filterText = e.target.value;
    renderRows();
  });

  document.querySelectorAll(".data-table th[data-col]").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-col");
      if (sortCol === col) {
        sortDir *= -1;
      } else {
        sortCol = col;
        sortDir = 1;
      }
      renderRows();
    });
  });

  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    if (currentRows.length === 0) {
      showToast("Nothing to export.", "error");
      return;
    }
    downloadCsv(`timesheet-recordings-${new Date().toISOString().slice(0, 10)}.csv`, columns, currentRows);
  });

  renderRows();
}
