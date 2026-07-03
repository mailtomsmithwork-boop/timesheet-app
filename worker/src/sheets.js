// Thin Google Sheets API v4 REST client. All calls authenticate with the
// cached bearer token from auth.js. valueRenderOption is always
// UNFORMATTED_VALUE on reads and valueInputOption always RAW on writes —
// this is deliberate (see worker/README.md) to avoid Sheets auto-converting
// date/time-looking text into serial numbers, the same bug hit once already
// on the Apps Script side.

import { getAccessToken } from "./auth.js";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsFetch(env, path, options = {}) {
  const token = await getAccessToken(env);
  const url = `${SHEETS_BASE}/${env.SPREADSHEET_ID}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Sheets API ${resp.status}: ${body}`);
  }
  return resp.json();
}

export async function getValues(env, range) {
  const data = await sheetsFetch(
    env,
    `/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`
  );
  return data.values || [];
}

export async function appendValues(env, range, values) {
  return sheetsFetch(
    env,
    `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) }
  );
}

export async function updateValues(env, range, values) {
  return sheetsFetch(env, `/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

export async function batchUpdateValues(env, data) {
  return sheetsFetch(env, `/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
}

export async function clearValues(env, range) {
  return sheetsFetch(env, `/values/${encodeURIComponent(range)}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function batchUpdate(env, requests) {
  return sheetsFetch(env, `:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
}

// Cached alongside the token — the sheet-name -> sheetId mapping is stable
// for the life of a tab, no need to refetch every request.
let cachedSheetMeta = null;

export async function getSpreadsheetMeta(env, forceRefresh = false) {
  if (cachedSheetMeta && !forceRefresh) return cachedSheetMeta;
  const data = await sheetsFetch(env, `?fields=${encodeURIComponent("sheets.properties(sheetId,title)")}`);
  cachedSheetMeta = data.sheets.map((s) => s.properties);
  return cachedSheetMeta;
}

export async function getSheetId(env, title) {
  let meta = await getSpreadsheetMeta(env);
  let found = meta.find((s) => s.title === title);
  if (!found) {
    // Sheet may have just been created (e.g. archiving) — refresh once.
    meta = await getSpreadsheetMeta(env, true);
    found = meta.find((s) => s.title === title);
  }
  if (!found) throw new Error(`Sheet tab not found: ${title}`);
  return found.sheetId;
}

export async function addSheet(env, title) {
  const result = await batchUpdate(env, [{ addSheet: { properties: { title } } }]);
  await getSpreadsheetMeta(env, true); // refresh cache to include the new tab
  return result.replies[0].addSheet.properties.sheetId;
}
