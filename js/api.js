// Thin fetch wrapper around the Apps Script Web App. Always GET, never sends
// custom headers, so cross-origin requests never trigger a CORS preflight.
async function apiGet(action, params) {
  params = params || {};

  let url;
  try {
    url = new URL(API_BASE);
  } catch (err) {
    throw new Error("API_BASE is not set. Paste your Web App URL into js/config.js.");
  }
  url.searchParams.set("action", action);
  Object.keys(params).forEach((k) => url.searchParams.set(k, params[k]));

  let res;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    throw new Error("Could not reach the backend. Check API_BASE in js/config.js.");
  }

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Unknown API error");
  }
  return json.data;
}
