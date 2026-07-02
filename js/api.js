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

  return fetchJson_(url.toString(), 1);
}

// Apps Script Web Apps occasionally return an HTML error page instead of
// JSON right after a fresh deploy (a known transient quirk, not something
// our code controls) — retry once before surfacing a clean error.
async function fetchJson_(url, retriesLeft) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error("Could not reach the backend. Check API_BASE in js/config.js.");
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    if (retriesLeft > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return fetchJson_(url, retriesLeft - 1);
    }
    throw new Error("The backend returned an invalid response. This can happen transiently with Apps Script — please try again.");
  }

  if (!json.ok) {
    throw new Error(json.error || "Unknown API error");
  }
  return json.data;
}
