/**
 * Web App entry point. Only doGet is used (no doPost) — writes go through
 * query-string params too, since Apps Script Web Apps + cross-origin POST
 * with a JSON body trigger a CORS preflight that Apps Script can't satisfy.
 * Plain GET with no custom headers never triggers a preflight.
 */
function doGet(e) {
  var action = e.parameter.action;
  try {
    var data;
    switch (action) {
      case 'getEntries':
        data = getEntries_();
        break;
      case 'addEntry':
        data = addEntry_(e.parameter);
        break;
      case 'deleteEntry':
        data = deleteEntry_(e.parameter);
        break;
      case 'getDashboardData':
        data = getDashboardData_();
        break;
      case 'getSettings':
        data = getSettings_();
        break;
      case 'saveSettings':
        data = saveSettings_(e.parameter);
        break;
      case 'getArchiveMonths':
        data = getArchiveMonths_();
        break;
      case 'getArchiveEntries':
        data = getArchiveEntries_(e.parameter);
        break;
      default:
        return jsonError_(action, 'Unknown or missing action: ' + action);
    }
    return jsonSuccess_(action, data);
  } catch (err) {
    return jsonError_(action, err.message || String(err));
  }
}

function getEntries_() {
  return getAllRows_('DataPool').map(formatEntryRow_);
}

/** Normalizes Date/TimeIn/TimeOut back to plain strings (see formatDateCell_/formatTimeCell_). */
function formatEntryRow_(row) {
  return {
    EntryID: row.EntryID,
    Date: formatDateCell_(row.Date),
    TimeIn: formatTimeCell_(row.TimeIn),
    TimeOut: formatTimeCell_(row.TimeOut),
    TotalTime: row.TotalTime,
    JobNumber: row.JobNumber,
    Reason: row.Reason
  };
}

function addEntry_(params) {
  ['Date', 'TimeIn', 'TimeOut', 'JobNumber', 'Reason'].forEach(function (key) {
    if (!params[key]) throw new Error('Missing required parameter: ' + key);
  });
  return withLock_(function () {
    var row = {
      EntryID: generateEntryId_(),
      Date: params.Date,
      TimeIn: params.TimeIn,
      TimeOut: params.TimeOut,
      TotalTime: computeTotalTime_(params.TimeIn, params.TimeOut),
      JobNumber: params.JobNumber,
      Reason: params.Reason
    };
    appendRow_('DataPool', row);
    logAction_('addEntry', row);
    return row;
  });
}

function deleteEntry_(params) {
  if (!params.EntryID) throw new Error('Missing required parameter: EntryID');
  return withLock_(function () {
    var deleted = deleteRowWhere_('DataPool', 'EntryID', params.EntryID);
    logAction_('deleteEntry', { EntryID: params.EntryID, deleted: deleted });
    return { EntryID: params.EntryID, deleted: deleted };
  });
}

function getDashboardData_() {
  return buildDashboardAggregates_(getAllRows_('DataPool'));
}

function buildDashboardAggregates_(rows) {
  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var startOfWeek = getStartOfWeek_(now);
  var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  var totalHours = 0, weekHours = 0, monthHours = 0;
  var byJob = {};

  rows.forEach(function (r) {
    var hours = parseFloat(r.TotalTime) || 0;
    var entryDate = (r.Date instanceof Date) ? r.Date : new Date(r.Date);
    totalHours += hours;
    if (entryDate >= startOfWeek) weekHours += hours;
    if (entryDate >= startOfMonth) monthHours += hours;
    var job = String(r.JobNumber);
    byJob[job] = (byJob[job] || 0) + hours;
  });

  return {
    entryCount: rows.length,
    totalHours: round2_(totalHours),
    weekHours: round2_(weekHours),
    monthHours: round2_(monthHours),
    byJobNumber: Object.keys(byJob).map(function (job) {
      return { jobNumber: job, hours: round2_(byJob[job]) };
    })
  };
}

/** Monday-start week boundary, at local midnight. */
function getStartOfWeek_(date) {
  var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  var day = d.getDay(); // 0 = Sunday
  var diff = (day === 0) ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function getSettings_() {
  var rows = getAllRows_('Settings');
  var obj = {};
  rows.forEach(function (r) {
    obj[r.Key] = r.Value;
  });
  return obj;
}

function saveSettings_(params) {
  return withLock_(function () {
    var updated = {};
    Object.keys(params).forEach(function (key) {
      if (key === 'action') return;
      upsertKeyValue_('Settings', key, params[key]);
      updated[key] = params[key];
    });
    logAction_('saveSettings', updated);
    return updated;
  });
}
