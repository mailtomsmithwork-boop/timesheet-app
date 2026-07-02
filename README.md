# Timesheet

A standalone, dark-themed timesheet web app for Thomas. Static frontend on GitHub
Pages, backed by a Google Sheet via a Google Apps Script Web App. No frameworks,
no build step — plain HTML/CSS/JS and plain Apps Script.

## Architecture

- **Frontend**: `index.html` + `css/` + `js/` — a hash-routed single-page app.
- **Backend**: `apps-script/*.gs` — deployed as an Apps Script Web App exposing
  only `doGet`, dispatched by an `action` query parameter. Writes (`addEntry`,
  `deleteEntry`, `saveSettings`) also go through GET with query params — this is
  deliberate, not an oversight. Apps Script Web Apps + cross-origin `fetch()`
  with a JSON POST body trigger a CORS preflight (`OPTIONS`) that Apps Script
  can't satisfy, so the request gets blocked by the browser. Plain GET with no
  custom headers is a "simple request" and never triggers a preflight.

## One-time setup

### 1. Deploy the backend

1. Open the Google Sheet this app uses.
2. **Extensions → Apps Script**. This creates a script *bound* to the sheet, so
   the code can use `SpreadsheetApp.getActiveSpreadsheet()` with no hardcoded
   spreadsheet ID.
3. Create four files in the Apps Script editor matching the ones in
   `apps-script/` here: `Code.gs`, `SheetService.gs`, `Utils.gs`, and open
   **Project Settings → Show "appsscript.json" manifest file in editor**, then
   paste in `appsscript.json`'s contents.
4. Run `ensureSheetsExist_` once from the editor (select it in the function
   dropdown, click Run) to confirm sheet access — this is optional since
   `DataPool`/`Settings`/`Logs` already exist with headers, and `getSheet_`
   would create them on first use anyway if they didn't.
5. **Deploy → New deployment → type: Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click Deploy, authorize the requested permissions, and copy the Web App URL
   (ends in `/exec`).

   **Important — deployment versioning:** editing the `.gs` files later does
   **not** change what the live `/exec` URL runs until you create a new version
   of *this same deployment* (Deploy → Manage deployments → pencil icon → New
   version → Deploy). Creating a brand-new deployment instead gives you a
   different URL, which would break `js/config.js` until updated. Always reuse
   the existing deployment.

### 2. Wire the frontend to the backend

Open `js/config.js` and replace the placeholder:

```js
const API_BASE = "PASTE_YOUR_WEB_APP_URL_HERE";
```

with the `/exec` URL from step 1.

### 3. Push to GitHub Pages

```
git init
git add .
git commit -m "Initial timesheet app"
git remote add origin <your-repo-url>
git push -u origin main
```

Then in the repo's **Settings → Pages**, set Source to the `main` branch, root
folder. The app will be live at `https://<username>.github.io/<repo>/`.

## Security note

The Web App is deployed with anonymous "Anyone" access — this is required to
avoid the CORS preflight problem described above. In practice, **the Web App
URL is the only thing protecting this data**: anyone who has it can read, add,
and delete timesheet entries. If this repo is public, that URL is visible in
`js/config.js` to anyone browsing the repo. This is an accepted tradeoff for a
personal single-user tool — don't share the `/exec` URL, and be aware a public
repo does expose it.

## Quotas

Consumer Google accounts get roughly 20,000 URL Fetch calls/day and a 6-minute
max execution time per script invocation. Not a practical concern for a single
user's timesheet.

## Local development

Open `index.html` with any static file server (or the Preview tool) to work on
the UI. API calls will fail with a clean error toast until `API_BASE` in
`js/config.js` points at a real deployed backend — that's expected.
