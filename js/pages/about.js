async function renderAbout(app) {
  app.innerHTML = `
    <h1>About</h1>
    <div class="about-panel">
      <p><strong>Timesheet</strong> — a custom timesheet application for Thomas.</p>
      <p>Built as a static single-page app hosted on GitHub Pages, backed by a Google Sheet
         via a Google Apps Script Web App. No frameworks, no build step.</p>
      <p>Data lives entirely in your Google Sheet, in the <code>DataPool</code>,
         <code>Settings</code>, and <code>Logs</code> tabs.</p>
    </div>
  `;
}
