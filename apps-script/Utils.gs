/**
 * Shared helpers: JSON envelope builders, locking, ID generation, time math, logging.
 */

function jsonSuccess_(action, data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, action: action, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(action, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, action: action, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Runs fn() while holding the script lock, so concurrent addEntry/deleteEntry/
 * saveSettings calls can't interleave and corrupt the sheet or double-generate IDs.
 */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function generateEntryId_() {
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS');
  var rand = Math.floor(Math.random() * 900 + 100);
  return 'E' + ts + rand;
}

/**
 * timeIn/timeOut are "HH:mm" strings. Rolls past midnight for overnight shifts
 * (timeOut <= timeIn is treated as spanning into the next day).
 * Returns decimal hours rounded to 2dp.
 */
function computeTotalTime_(timeIn, timeOut) {
  var inParts = timeIn.split(':').map(Number);
  var outParts = timeOut.split(':').map(Number);
  var minutesIn = inParts[0] * 60 + inParts[1];
  var minutesOut = outParts[0] * 60 + outParts[1];
  if (minutesOut <= minutesIn) {
    minutesOut += 24 * 60;
  }
  var totalMinutes = minutesOut - minutesIn;
  return round2_(totalMinutes / 60);
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}

function logAction_(action, details) {
  var sheet = getSheet_('Logs');
  sheet.appendRow([new Date(), action, JSON.stringify(details)]);
}
