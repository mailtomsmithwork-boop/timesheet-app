import {
  getValues,
  appendValues,
  updateValues,
  batchUpdateValues,
  clearValues,
  batchUpdate,
  getSheetId,
  addSheet,
  getSpreadsheetMeta,
} from "./sheets.js";

const SHEET_HEADERS = {
  DataPool: ["EntryID", "Date", "TimeIn", "TimeOut", "TotalTime", "JobNumber", "Reason"],
  Settings: ["Key", "Value"],
  Logs: ["Timestamp", "Action", "Details"],
};

// Google Sheets date/time serial numbers (days since Dec 30 1899, or a
// fraction of a day for times). Entries written via the Worker are always
// plain RAW strings and never hit this path, but rows written by the old
// Apps Script backend (which auto-converted date/time-looking text into
// real Date cells) still contain legacy serial numbers — normalize both.
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeDateValue(value) {
  if (typeof value !== "number") return value;
  const d = new Date(SHEETS_EPOCH_MS + Math.round(value) * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeTimeValue(value) {
  if (typeof value !== "number") return value;
  const totalMinutes = Math.round(value * 24 * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function normalizeEntryRow(row) {
  return {
    ...row,
    Date: normalizeDateValue(row.Date),
    TimeIn: normalizeTimeValue(row.TimeIn),
    TimeOut: normalizeTimeValue(row.TimeOut),
  };
}

function rowsToObjects(headers, rows) {
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? row[i] : "";
    });
    return obj;
  });
}

async function logAction(env, action, details) {
  try {
    await appendValues(env, "Logs!A1:C", [[new Date().toISOString(), action, JSON.stringify(details)]]);
  } catch (err) {
    console.error("logAction failed", err);
  }
}

function parseHHMM(s) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function computeTotalTime(timeIn, timeOut) {
  const inMin = parseHHMM(timeIn);
  let outMin = parseHHMM(timeOut);
  if (outMin <= inMin) outMin += 24 * 60;
  const totalMinutes = outMin - inMin;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

// Extracts Y/M/D/H/m/s parts for a timezone via Intl, avoiding manual UTC-offset
// arithmetic (which would need separate GMT/BST handling).
function londonParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return parts;
}

function generateEntryId() {
  const p = londonParts(new Date());
  const ms = String(new Date().getMilliseconds()).padStart(3, "0");
  const rand3 = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `E${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}${ms}${rand3}`;
}

function londonTodayISO(date = new Date()) {
  const p = londonParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

// Monday-start week boundary (ISO date string, so lexicographic == chronological).
function startOfWeekISO(date = new Date()) {
  const p = londonParts(date);
  const d = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const dow = d.getUTCDay(); // 0 = Sunday
  const diff = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonthISO(date = new Date()) {
  const p = londonParts(date);
  return `${p.year}-${p.month}-01`;
}

function previousMonthLabel(date = new Date()) {
  const p = londonParts(date);
  let year = Number(p.year);
  let month = Number(p.month) - 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function getEntries(env) {
  const rows = await getValues(env, "DataPool!A2:G");
  return rowsToObjects(SHEET_HEADERS.DataPool, rows).map(normalizeEntryRow);
}

export async function addEntry(env, params) {
  ["Date", "TimeIn", "TimeOut", "JobNumber", "Reason"].forEach((key) => {
    if (!params.get(key)) throw new Error("Missing required parameter: " + key);
  });
  const row = {
    EntryID: generateEntryId(),
    Date: params.get("Date"),
    TimeIn: params.get("TimeIn"),
    TimeOut: params.get("TimeOut"),
    TotalTime: computeTotalTime(params.get("TimeIn"), params.get("TimeOut")),
    JobNumber: params.get("JobNumber"),
    Reason: params.get("Reason"),
  };
  const values = SHEET_HEADERS.DataPool.map((h) => row[h]);
  await appendValues(env, "DataPool!A1:G", [values]);
  await logAction(env, "addEntry", row);
  return row;
}

export async function updateEntry(env, params) {
  const entryId = params.get("EntryID");
  if (!entryId) throw new Error("Missing required parameter: EntryID");
  ["Date", "TimeIn", "TimeOut", "JobNumber", "Reason"].forEach((key) => {
    if (!params.get(key)) throw new Error("Missing required parameter: " + key);
  });

  const colA = await getValues(env, "DataPool!A:A");
  const rowIndex = colA.findIndex((r) => String(r[0]) === String(entryId));
  if (rowIndex === -1) {
    return { EntryID: entryId, updated: false };
  }

  const row = {
    EntryID: entryId,
    Date: params.get("Date"),
    TimeIn: params.get("TimeIn"),
    TimeOut: params.get("TimeOut"),
    TotalTime: computeTotalTime(params.get("TimeIn"), params.get("TimeOut")),
    JobNumber: params.get("JobNumber"),
    Reason: params.get("Reason"),
  };
  const values = SHEET_HEADERS.DataPool.map((h) => row[h]);
  const sheetRowNum = rowIndex + 1; // rowIndex is 0-based including header, sheet rows are 1-based
  await updateValues(env, `DataPool!A${sheetRowNum}:G${sheetRowNum}`, [values]);
  await logAction(env, "updateEntry", row);
  return { ...row, updated: true };
}

export async function deleteEntry(env, params) {
  const entryId = params.get("EntryID");
  if (!entryId) throw new Error("Missing required parameter: EntryID");

  const colA = await getValues(env, "DataPool!A:A");
  const rowIndex = colA.findIndex((r) => String(r[0]) === String(entryId));
  if (rowIndex === -1) {
    await logAction(env, "deleteEntry", { EntryID: entryId, deleted: false });
    return { EntryID: entryId, deleted: false };
  }

  const sheetId = await getSheetId(env, "DataPool");
  await batchUpdate(env, [
    {
      deleteDimension: {
        range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 },
      },
    },
  ]);
  await logAction(env, "deleteEntry", { EntryID: entryId, deleted: true });
  return { EntryID: entryId, deleted: true };
}

export async function getDashboardData(env) {
  const rows = await getValues(env, "DataPool!A2:G");
  const entries = rowsToObjects(SHEET_HEADERS.DataPool, rows).map(normalizeEntryRow);

  const weekStart = startOfWeekISO();
  const monthStart = startOfMonthISO();

  let totalHours = 0,
    weekHours = 0,
    monthHours = 0;
  const byJob = {};

  entries.forEach((r) => {
    const hours = parseFloat(r.TotalTime) || 0;
    const dateStr = String(r.Date);
    totalHours += hours;
    if (dateStr >= weekStart) weekHours += hours;
    if (dateStr >= monthStart) monthHours += hours;
    const job = String(r.JobNumber);
    byJob[job] = (byJob[job] || 0) + hours;
  });

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    entryCount: entries.length,
    totalHours: round2(totalHours),
    weekHours: round2(weekHours),
    monthHours: round2(monthHours),
    byJobNumber: Object.keys(byJob).map((job) => ({ jobNumber: job, hours: round2(byJob[job]) })),
  };
}

export async function getSettings(env) {
  const rows = await getValues(env, "Settings!A2:B");
  const obj = {};
  rows.forEach((r) => {
    obj[r[0]] = r[1];
  });
  return obj;
}

export async function saveSettings(env, params) {
  const existingRows = await getValues(env, "Settings!A2:B");
  const keyIndex = new Map(existingRows.map((r, i) => [String(r[0]), i]));

  const updates = [];
  const appends = [];
  const updated = {};

  for (const [key, value] of params.entries()) {
    if (key === "action") continue;
    updated[key] = value;
    if (keyIndex.has(key)) {
      const rowNum = keyIndex.get(key) + 2; // +2: skip header, convert to 1-based
      updates.push({ range: `Settings!B${rowNum}`, values: [[value]] });
    } else {
      appends.push([key, value]);
    }
  }

  if (updates.length > 0) {
    await batchUpdateValues(env, updates);
  }
  for (const row of appends) {
    // Sequential on purpose: each append must see the effect of the previous
    // one so two new keys in the same call don't collide on the same row.
    await appendValues(env, "Settings!A1:B", [row]);
  }

  await logAction(env, "saveSettings", updated);
  return updated;
}

export async function getArchiveMonths(env) {
  const meta = await getSpreadsheetMetaTitles(env);
  return meta
    .filter((title) => /^Archive-\d\d\d\d-\d\d$/.test(title))
    .sort()
    .reverse();
}

async function getSpreadsheetMetaTitles(env) {
  const meta = await getSpreadsheetMeta(env, true);
  return meta.map((s) => s.title);
}

export async function getArchiveEntries(env, params) {
  const month = params.get("month");
  if (!month || !/^\d\d\d\d-\d\d$/.test(month)) {
    throw new Error("Invalid or missing month parameter (expected YYYY-MM)");
  }
  const sheetName = `Archive-${month}`;
  const titles = await getSpreadsheetMetaTitles(env);
  if (!titles.includes(sheetName)) {
    throw new Error("No archive found for " + month);
  }
  const rows = await getValues(env, `${sheetName}!A2:G`);
  return rowsToObjects(SHEET_HEADERS.DataPool, rows).map(normalizeEntryRow);
}

export async function archiveCurrentMonth(env) {
  const dataRows = await getValues(env, "DataPool!A2:G");
  if (dataRows.length === 0) {
    await logAction(env, "archiveLastMonth", { skipped: true, reason: "DataPool empty" });
    return;
  }

  const monthLabel = previousMonthLabel();
  const archiveSheetName = `Archive-${monthLabel}`;
  const titles = await getSpreadsheetMetaTitles(env);

  if (!titles.includes(archiveSheetName)) {
    await addSheet(env, archiveSheetName);
    await appendValues(env, `${archiveSheetName}!A1:G`, [SHEET_HEADERS.DataPool]);
  }

  await appendValues(env, `${archiveSheetName}!A1:G`, dataRows);
  await clearValues(env, "DataPool!A2:G");

  await logAction(env, "archiveLastMonth", { month: monthLabel, entriesArchived: dataRows.length });
}

export async function handleAction(action, params, env) {
  switch (action) {
    case "getEntries":
      return getEntries(env);
    case "addEntry":
      return addEntry(env, params);
    case "updateEntry":
      return updateEntry(env, params);
    case "deleteEntry":
      return deleteEntry(env, params);
    case "getDashboardData":
      return getDashboardData(env);
    case "getSettings":
      return getSettings(env);
    case "saveSettings":
      return saveSettings(env, params);
    case "getArchiveMonths":
      return getArchiveMonths(env);
    case "getArchiveEntries":
      return getArchiveEntries(env, params);
    default:
      throw new Error("Unknown or missing action: " + action);
  }
}
