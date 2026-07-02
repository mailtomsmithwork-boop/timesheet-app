// Converts decimal hours (e.g. 7.5) into "7h 30m" for display.
function formatHoursMinutes(decimalHours) {
  const totalMinutes = Math.round((Number(decimalHours) || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
