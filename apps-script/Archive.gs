/**
 * Monthly archiving. archiveLastMonth_ is meant to run on a time-based
 * trigger (see setUpMonthlyArchiveTrigger_) firing on the 1st of each month:
 * it moves everything currently in DataPool into an "Archive-YYYY-MM" sheet
 * (named for the month that just ended) and clears DataPool back to headers.
 */
function archiveLastMonth_() {
  return withLock_(function () {
    var dataSheet = getSheet_('DataPool');
    var values = dataSheet.getDataRange().getValues();
    if (values.length < 2) {
      logAction_('archiveLastMonth', { skipped: true, reason: 'DataPool empty' });
      return;
    }

    var now = new Date();
    var lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var monthLabel = Utilities.formatDate(lastMonthDate, Session.getScriptTimeZone(), 'yyyy-MM');
    var archiveSheetName = 'Archive-' + monthLabel;

    var ss = getSpreadsheet_();
    var archiveSheet = ss.getSheetByName(archiveSheetName);
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet(archiveSheetName);
      archiveSheet.appendRow(SHEET_HEADERS.DataPool);
    }

    var dataRows = values.slice(1);
    dataRows.forEach(function (row) {
      archiveSheet.appendRow(row);
    });

    if (dataSheet.getLastRow() > 1) {
      dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, dataSheet.getLastColumn()).clearContent();
    }

    logAction_('archiveLastMonth', { month: monthLabel, entriesArchived: dataRows.length });
  });
}

/**
 * One-time manual setup: run this once from the Apps Script editor (select
 * it in the function dropdown, click Run). Installs a trigger that calls
 * archiveLastMonth_ at 1am on the 1st of every month. Safe to re-run — it
 * removes any existing trigger for this function first, so it won't stack.
 */
function setUpMonthlyArchiveTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'archiveLastMonth_') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('archiveLastMonth_')
    .timeBased()
    .onMonthDay(1)
    .atHour(1)
    .create();
}

function getArchiveMonths_() {
  var ss = getSpreadsheet_();
  return ss
    .getSheets()
    .map(function (s) { return s.getName(); })
    .filter(function (name) { return /^Archive-\d{4}-\d{2}$/.test(name); })
    .sort()
    .reverse();
}

function getArchiveEntries_(params) {
  var month = params.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Invalid or missing month parameter (expected YYYY-MM)');
  }
  var sheetName = 'Archive-' + month;
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('No archive found for ' + month);
  }
  return valuesToObjects_(sheet.getDataRange().getValues()).map(formatEntryRow_);
}
