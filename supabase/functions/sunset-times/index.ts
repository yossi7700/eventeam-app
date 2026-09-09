import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

// Wraps two separate hebcal.com APIs:
//  - /zmanim for plain astronomical sunset (accepts geonameid or lat/long).
//  - /shabbat for candle-lighting and havdalah, which -- caught on
//    re-verifying against the old system's getHebTime() -- is a genuinely
//    different endpoint with different fields; /zmanim's response has NO
//    candlelighting or havdalah keys at all (confirmed against hebcal's own
//    docs), so this function's earlier version was silently always
//    returning null for both, dead code masquerading as working. /shabbat
//    only accepts geonameid (no raw lat/long), matching the old system's
//    own getGeonameId()-or-nothing usage.
//
// before_sunset_minutes maps to the old system's before_sunset_time
// setting (candle-lighting minutes before sunset; hebcal defaults to 18
// when omitted, same as the old system's implicit "?? 0" not quite
// matching hebcal's own default -- passed through only when provided so
// hebcal's default applies otherwise).
//
// hebcal.com has no test/sandbox mode, so this function's only real
// failure path (the API being unreachable, or the geonameid/lat-lon being
// invalid) is handled explicitly rather than left to crash -- callers get
// a clear error instead of an unhandled fetch exception.

type SunsetTimesInput = {
  date: string; // YYYY-MM-DD
  geonameid?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  before_sunset_minutes?: number;
};

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  let input: SunsetTimesInput;
  if (req.method === "GET") {
    const url = new URL(req.url);
    input = {
      date: url.searchParams.get("date") ?? "",
      geonameid: url.searchParams.get("geonameid") ?? undefined,
      latitude: url.searchParams.get("latitude")
        ? Number(url.searchParams.get("latitude"))
        : undefined,
      longitude: url.searchParams.get("longitude")
        ? Number(url.searchParams.get("longitude"))
        : undefined,
      timezone: url.searchParams.get("timezone") ?? undefined,
      before_sunset_minutes: url.searchParams.get("before_sunset_minutes")
        ? Number(url.searchParams.get("before_sunset_minutes"))
        : undefined,
    };
  } else {
    try {
      input = await req.json();
    } catch {
      return errorResponse("invalid JSON body", 400, corsHeaders);
    }
  }

  if (!input.date) {
    return errorResponse("date (YYYY-MM-DD) is required", 422, corsHeaders);
  }
  if (!input.geonameid && (input.latitude == null || input.longitude == null)) {
    return errorResponse("either geonameid or latitude+longitude is required", 422, corsHeaders);
  }

  const zmanimUrl = new URL("https://www.hebcal.com/zmanim");
  zmanimUrl.searchParams.set("cfg", "json");
  zmanimUrl.searchParams.set("date", input.date);
  if (input.geonameid) {
    zmanimUrl.searchParams.set("geonameid", input.geonameid);
  } else {
    zmanimUrl.searchParams.set("latitude", String(input.latitude));
    zmanimUrl.searchParams.set("longitude", String(input.longitude));
    if (input.timezone) zmanimUrl.searchParams.set("tzid", input.timezone);
  }

  try {
    const zmanimResponse = await fetch(zmanimUrl.toString());
    if (!zmanimResponse.ok) {
      throw new Error(`hebcal.com/zmanim returned ${zmanimResponse.status}`);
    }
    const zmanimData = await zmanimResponse.json();
    const sunset: string | null = zmanimData.times?.sunset ?? null;

    // Candle-lighting/havdalah only come from /shabbat, and only when a
    // geonameid is available (that endpoint has no raw lat/long mode,
    // matching the old system's own getGeonameId()-or-nothing usage).
    let candleLighting: string | null = null;
    let havdalah: string | null = null;

    if (input.geonameid) {
      const [y, m, d] = input.date.split("-");
      const shabbatUrl = new URL("https://www.hebcal.com/shabbat");
      shabbatUrl.searchParams.set("cfg", "json");
      shabbatUrl.searchParams.set("geonameid", input.geonameid);
      shabbatUrl.searchParams.set("gy", y);
      shabbatUrl.searchParams.set("gm", String(Number(m)));
      shabbatUrl.searchParams.set("gd", String(Number(d)));
      if (input.before_sunset_minutes != null) {
        shabbatUrl.searchParams.set("b", String(input.before_sunset_minutes));
      }

      const havdalahUrl = new URL(shabbatUrl.toString());
      havdalahUrl.searchParams.set("M", "on");

      const [candlesResponse, havdalahResponse] = await Promise.all([
        fetch(shabbatUrl.toString()),
        fetch(havdalahUrl.toString()),
      ]);

      if (candlesResponse.ok) {
        const candlesData = await candlesResponse.json();
        candleLighting =
          (candlesData.items ?? []).find((i: { category: string }) => i.category === "candles")
            ?.date ?? null;
      }
      if (havdalahResponse.ok) {
        const havdalahData = await havdalahResponse.json();
        havdalah =
          (havdalahData.items ?? []).find((i: { category: string }) => i.category === "havdalah")
            ?.date ?? null;
      }
    }

    return jsonResponse(
      {
        date: input.date,
        sunset,
        candle_lighting: candleLighting,
        havdalah,
        raw: zmanimData.times ?? null,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    return errorResponse(`failed to fetch sunset times: ${(err as Error).message}`, 502, corsHeaders);
  }
});
