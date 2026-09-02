import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { errorResponse, jsonResponse } from "../_shared/supabase.ts";

// Wraps hebcal.com's public Zmanim (halachic times) API. Used by
// publish-template-event to compute sub-event start times relative to
// sunset/candle-lighting for a given date and location.
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
};

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("method not allowed", 405);
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
    };
  } else {
    try {
      input = await req.json();
    } catch {
      return errorResponse("invalid JSON body", 400);
    }
  }

  if (!input.date) {
    return errorResponse("date (YYYY-MM-DD) is required", 422);
  }
  if (!input.geonameid && (input.latitude == null || input.longitude == null)) {
    return errorResponse("either geonameid or latitude+longitude is required", 422);
  }

  const hebcalUrl = new URL("https://www.hebcal.com/zmanim");
  hebcalUrl.searchParams.set("cfg", "json");
  hebcalUrl.searchParams.set("date", input.date);
  if (input.geonameid) {
    hebcalUrl.searchParams.set("geonameid", input.geonameid);
  } else {
    hebcalUrl.searchParams.set("latitude", String(input.latitude));
    hebcalUrl.searchParams.set("longitude", String(input.longitude));
    if (input.timezone) hebcalUrl.searchParams.set("tzid", input.timezone);
  }

  try {
    const response = await fetch(hebcalUrl.toString());
    if (!response.ok) {
      throw new Error(`hebcal.com returned ${response.status}`);
    }
    const data = await response.json();

    return jsonResponse({
      date: input.date,
      sunset: data.times?.sunset ?? null,
      candle_lighting: data.times?.candlelighting ?? null,
      havdalah: data.times?.havdalah ?? null,
      raw: data.times ?? null,
    });
  } catch (err) {
    return errorResponse(`failed to fetch sunset times: ${(err as Error).message}`, 502);
  }
});
