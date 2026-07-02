async function renderDashboard(app) {
  const dashboard = await getDashboardCached();

  app.innerHTML = `
    <h1>Dashboard</h1>
    <div class="card-grid">
      <div class="card">
        <div class="card-label">Total Hours</div>
        <div class="card-value">${formatHoursMinutes(dashboard.totalHours)}</div>
      </div>
      <div class="card">
        <div class="card-label">This Week</div>
        <div class="card-value">${formatHoursMinutes(dashboard.weekHours)}</div>
      </div>
      <div class="card">
        <div class="card-label">This Month</div>
        <div class="card-value">${formatHoursMinutes(dashboard.monthHours)}</div>
      </div>
      <div class="card">
        <div class="card-label">Entries</div>
        <div class="card-value">${dashboard.entryCount}</div>
      </div>
    </div>
    <h2>Hours by Job Number</h2>
    <canvas id="jobChart" width="800" height="280" class="chart-canvas"></canvas>
  `;

  const canvas = document.getElementById("jobChart");
  const data = dashboard.byJobNumber.map((d) => ({ label: d.jobNumber, value: d.hours }));
  if (data.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#9aa1b1";
    ctx.font = "14px sans-serif";
    ctx.fillText("No data yet.", 16, 30);
  } else {
    drawBarChart(canvas, data);
  }
}

function drawBarChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const max = Math.max.apply(null, data.map((d) => d.value).concat([1]));
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2f8fff";
  const slot = w / data.length;
  const barWidth = slot * 0.6;

  data.forEach((d, i) => {
    const barHeight = (d.value / max) * (h - 40);
    const x = i * slot + (slot - barWidth) / 2;
    const y = h - barHeight - 20;

    ctx.fillStyle = accent;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#9aa1b1";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.label, x + barWidth / 2, h - 6);
    ctx.fillText(d.value.toFixed(1), x + barWidth / 2, y - 4);
  });
}
