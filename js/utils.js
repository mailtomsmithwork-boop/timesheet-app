// Standard scheduled hours — shared by the Quick Time Check (New Entry) and
// the Dashboard's overtime stat.
const STANDARD_SCHEDULE = {
  Monday: { start: "09:00", end: "17:00" },
  Tuesday: { start: "09:00", end: "17:00" },
  Wednesday: { start: "09:00", end: "17:00" },
  Thursday: { start: "09:00", end: "17:00" },
  Friday: { start: "09:00", end: "15:30" },
};

function timeToMinutes_(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getWeekdayName_(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}

// Standard shift length for a given date, in minutes. 0 for weekends/unknown.
function standardMinutesForDate(dateStr) {
  const schedule = STANDARD_SCHEDULE[getWeekdayName_(dateStr)];
  if (!schedule) return 0;
  return timeToMinutes_(schedule.end) - timeToMinutes_(schedule.start);
}

// Monday-start week boundary as an ISO date string (mirrors the backend's
// startOfWeekISO so "this week" means the same thing on both sides).
function startOfWeekISOClient(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0 = Sunday
  const diff = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Converts decimal hours (e.g. 7.5) into "7h 30m" for display.
function formatHoursMinutes(decimalHours) {
  const totalMinutes = Math.round((Number(decimalHours) || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function csvEscape(value) {
  const s = String(value !== undefined && value !== null ? value : "");
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Downloads `rows` (array of objects) as a CSV file named `filename`,
// using `columns` for both the header row and column order.
function downloadCsv(filename, columns, rows) {
  const lines = [columns.join(",")];
  rows.forEach((r) => {
    lines.push(columns.map((c) => csvEscape(r[c])).join(","));
  });
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
