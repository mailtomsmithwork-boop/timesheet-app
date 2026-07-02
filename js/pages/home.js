async function renderHome(app) {
  const dashboard = await getDashboardCached();

  app.innerHTML = `
    <h1>Welcome back, Thomas</h1>
    <div class="card-grid">
      <div class="card">
        <div class="card-label">This Week</div>
        <div class="card-value">${formatHoursMinutes(dashboard.weekHours)}</div>
      </div>
      <div class="card">
        <div class="card-label">This Month</div>
        <div class="card-value">${formatHoursMinutes(dashboard.monthHours)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Hours</div>
        <div class="card-value">${formatHoursMinutes(dashboard.totalHours)}</div>
      </div>
      <div class="card">
        <div class="card-label">Entries Logged</div>
        <div class="card-value">${dashboard.entryCount}</div>
      </div>
    </div>
    <div class="quick-actions">
      <a class="btn btn-primary" href="#/new-entry">+ New Entry</a>
      <a class="btn btn-secondary" href="#/recordings">View Recordings</a>
    </div>
  `;
}
