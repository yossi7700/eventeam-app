import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

type PublishTemplateInput = {
  template_event_id: string;
  target_date: string; // YYYY-MM-DD, the date the company wants to publish the event onto
  slug: string;
  geonameid?: string;
  latitude?: number;
  longitude?: number;
};

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  let body: PublishTemplateInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400, corsHeaders);
  }

  if (!body.template_event_id || !body.target_date || !body.slug) {
    return errorResponse("template_event_id, target_date, and slug are required", 422, corsHeaders);
  }
  if (!body.geonameid && (body.latitude == null || body.longitude == null)) {
    return errorResponse("either geonameid or latitude+longitude is required", 422, corsHeaders);
  }

  const userClient = createUserClient(req);
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401, corsHeaders);
  }

  const { data: company } = await userClient
    .from("companies")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!company) {
    return errorResponse("no company found for this account", 404, corsHeaders);
  }

  // Companies can read master template events via RLS (see the "events:
  // select for authenticated" policy), but the service role is used here
  // regardless to keep this read consistent/atomic with the write below.
  const serviceClient = createServiceClient();
  const { data: template } = await serviceClient
    .from("events")
    .select("title, description, cover_image_path, timezone, sub_events(*, products(*))")
    .eq("id", body.template_event_id)
    .eq("is_master_template", true)
    .maybeSingle();

  if (!template) {
    return errorResponse("template event not found", 404, corsHeaders);
  }

  type TemplateSubEvent = {
    title: string;
    description: string | null;
    location: string | null;
    is_sunset_relative: boolean;
    sunset_offset_minutes: number | null;
    sort_order: number;
    products: {
      name: string;
      description: string | null;
      price: number;
      currency: string;
      capacity: number | null;
      sort_order: number;
    }[];
  };

  const subEvents = (template.sub_events as unknown as TemplateSubEvent[]) ?? [];
  const needsSunset = subEvents.some((se) => se.is_sunset_relative);

  let sunsetTime: Date | null = null;
  if (needsSunset) {
    // before_sunset_minutes is the company's candle-lighting offset (old
    // system's before_sunset_time) -- only meaningful when hebcal can
    // resolve a geonameid-based candle-lighting time; harmless to pass
    // when using raw lat/long since sunset-times ignores it in that case.
    const { data: companySettings } = await serviceClient
      .from("company_settings")
      .select("before_sunset_minutes")
      .eq("company_id", company.id)
      .maybeSingle();

    const sunsetUrl = new URL(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sunset-times`);
    sunsetUrl.searchParams.set("date", body.target_date);
    if (body.geonameid) {
      sunsetUrl.searchParams.set("geonameid", body.geonameid);
    } else {
      sunsetUrl.searchParams.set("latitude", String(body.latitude));
      sunsetUrl.searchParams.set("longitude", String(body.longitude));
    }
    if (companySettings?.before_sunset_minutes != null) {
      sunsetUrl.searchParams.set(
        "before_sunset_minutes",
        String(companySettings.before_sunset_minutes)
      );
    }

    const sunsetResponse = await fetch(sunsetUrl.toString(), {
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
    });

    if (!sunsetResponse.ok) {
      return errorResponse(
        `could not compute sunset time for the target date/location: ${await sunsetResponse.text()}`,
        502,
        corsHeaders
      );
    }

    const sunsetData = await sunsetResponse.json();
    // Anchor sunset-relative sub-events to candle-lighting time when
    // available (matches the old system's actual semantics -- companies
    // configure events relative to candle-lighting, not raw astronomical
    // sunset), falling back to plain sunset when hebcal couldn't resolve
    // candle-lighting for this location (e.g. raw lat/long input).
    const anchor = sunsetData.candle_lighting ?? sunsetData.sunset;
    if (!anchor) {
      return errorResponse(
        "sunset-times returned no usable time for this date/location",
        502,
        corsHeaders
      );
    }
    sunsetTime = new Date(anchor);
  }

  const dayStart = new Date(`${body.target_date}T00:00:00Z`);
  const dayEnd = new Date(`${body.target_date}T23:59:59Z`);

  const subEventsPayload = subEvents.map((se) => {
    let startAt: string;
    if (se.is_sunset_relative && sunsetTime) {
      const offsetMs = (se.sunset_offset_minutes ?? 0) * 60_000;
      startAt = new Date(sunsetTime.getTime() + offsetMs).toISOString();
    } else {
      startAt = dayStart.toISOString();
    }

    return {
      title: se.title,
      description: se.description,
      location: se.location,
      start_at: startAt,
      capacity: null,
      is_sunset_relative: se.is_sunset_relative,
      sunset_offset_minutes: se.sunset_offset_minutes,
      sort_order: se.sort_order,
      products: se.products.map((p) => ({
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        capacity: p.capacity,
        sort_order: p.sort_order,
      })),
    };
  });

  const { data: newEventId, error } = await userClient.rpc("create_event_with_children", {
    p_company_id: company.id,
    p_title: template.title,
    p_slug: body.slug,
    p_description: template.description,
    p_cover_image_path: template.cover_image_path,
    p_start_date: dayStart.toISOString(),
    p_end_date: dayEnd.toISOString(),
    p_timezone: template.timezone,
    p_sub_events: subEventsPayload,
  });

  if (error) {
    return errorResponse(error.message, 400, corsHeaders);
  }

  // Mark the new event as published-from-template and link back to the
  // template for provenance (create_event_with_children doesn't set these
  // since it's shared with the plain "create a standalone event" path).
  await serviceClient
    .from("events")
    .update({ source: "published_from_template", template_id: body.template_event_id })
    .eq("id", newEventId);

  return jsonResponse({ event_id: newEventId }, 200, corsHeaders);
});
