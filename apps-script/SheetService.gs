/**
 * Sheet access helpers. Script is expected to be bound to the spreadsheet
 * (created via Extensions > Apps Script on the sheet itself), so
 * SpreadsheetApp.getActiveSpreadsheet() resolves it without a hardcoded ID.
 */

var SHEET_HEADERS = {
  DataPool: ['EntryID', 'Date', 'TimeIn', 'TimeOut', 'TotalTime', 'JobNumber', 'Reason'],
  Settings: ['Key', 'Value'],
  Logs: ['Timestamp', 'Action', 'Details']
};

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Returns the named sheet, creating it with the correct header row if it
 * doesn't exist yet. This is a defensive fallback so the Web App still works
 * even if ensureSheetsExist_() was never run manually.
 */
function getSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = SHEET_HEADERS[name];
    if (headers) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

/** One-time manual setup: run this from the Apps Script editor to pre-create all tabs. */
function ensureSheetsExist_() {
  Object.keys(SHEET_HEADERS).forEach(function (name) {
    getSheet_(name);
  });
}

function valuesToObjects_(values) {
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i];
    });
    return obj;
  });
}

function getAllRows_(sheetName) {
  var sheet = getSheet_(sheetName);
  return valuesToObjects_(sheet.getDataRange().getValues());
}

function appendRow_(sheetName, rowObject) {
  var sheet = getSheet_(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var row = headers.map(function (h) {
    return rowObject[h] !== undefined ? rowObject[h] : '';
  });
  sheet.appendRow(row);
}

/** Returns true if a row was found and deleted. */
function deleteRowWhere_(sheetName, keyColumn, keyValue) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var colIndex = headers.indexOf(keyColumn);
  if (colIndex === -1) return false;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][colIndex]) === String(keyValue)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/** Finds a row where column A === key and updates column B, or appends a new row. */
function upsertKeyValue_(sheetName, key, value) {
  var sheet = getSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(key)) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}
