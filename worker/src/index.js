import { handleAction, archiveCurrentMonth } from "./handlers.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function ok(action, data) {
  return jsonResponse({ ok: true, action, data });
}

function fail(action, err) {
  return jsonResponse({ ok: false, action, error: err && err.message ? err.message : String(err) });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" },
      });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    try {
      const data = await handleAction(action, url.searchParams, env);
      return ok(action, data);
    } catch (err) {
      return fail(action, err);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      archiveCurrentMonth(env).catch((err) => console.error("archiveCurrentMonth failed", err))
    );
  },
};
