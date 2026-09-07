// Explicit CORS allow-list, replacing the old system's wide-open
// `Access-Control-Allow-Origin: *`. ALLOWED_ORIGINS is a comma-separated
// env var (`supabase secrets set ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com`);
// localhost dev ports are always allowed regardless, so local development
// never depends on that secret being set.

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
];

function getAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  const fromEnv = configured ? configured.split(",").map((o) => o.trim()).filter(Boolean) : [];
  return [...DEV_ORIGINS, ...fromEnv];
}

function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  const allowed = getAllowedOrigins();
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

// Call at the top of every browser-callable function: if this returns a
// Response, return it immediately (it's the OPTIONS preflight reply).
// Otherwise, spread the returned headers into every actual response.
export function handleCors(req: Request): { preflight: Response | null; headers: HeadersInit } {
  const origin = req.headers.get("Origin");
  const allowedOrigin = resolveAllowedOrigin(origin);

  const headers: HeadersInit = allowedOrigin
    ? {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        Vary: "Origin",
      }
    : {};

  if (req.method === "OPTIONS") {
    return { preflight: new Response(null, { status: 204, headers }), headers };
  }

  return { preflight: null, headers };
}
