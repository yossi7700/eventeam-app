import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

type ExportInput = {
  event_id: string;
};

function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  let body: ExportInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400, corsHeaders);
  }

  if (!body.event_id) {
    return errorResponse("event_id is required", 422, corsHeaders);
  }

  // Read as the calling user so RLS enforces they can only export leads for
  // an event they actually own (or admin, who can see everything).
  const userClient = createUserClient(req);
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401, corsHeaders);
  }

  const { data: registrations, error } = await userClient
    .from("registrations")
    .select(
      `id, status, primary_guest_name, primary_guest_email, primary_guest_phone,
       subtotal, donation_total, total_amount, payment_method, created_at,
       guests (
         full_name, email, phone,
         guest_line_items ( quantity, unit_price, line_total, products ( name ) )
       )`
    )
    .eq("event_id", body.event_id);

  if (error) {
    return errorResponse(error.message, 400, corsHeaders);
  }

  if (!registrations || registrations.length === 0) {
    return jsonResponse(
      { error: "No registrations found for this event, or you do not have access to it." },
      404,
      corsHeaders
    );
  }

  const rows: string[] = [
    [
      "registration_id",
      "registration_status",
      "primary_guest_name",
      "primary_guest_email",
      "primary_guest_phone",
      "guest_name",
      "guest_email",
      "guest_phone",
      "ticket_type",
      "quantity",
      "unit_price",
      "line_total",
      "subtotal",
      "donation_total",
      "total_amount",
      "payment_method",
      "created_at",
    ].join(","),
  ];

  type RegistrationRow = {
    id: string;
    status: string;
    primary_guest_name: string;
    primary_guest_email: string;
    primary_guest_phone: string | null;
    subtotal: number;
    donation_total: number;
    total_amount: number;
    payment_method: string;
    created_at: string;
    guests: {
      full_name: string;
      email: string | null;
      phone: string | null;
      guest_line_items: {
        quantity: number;
        unit_price: number;
        line_total: number;
        products: { name: string } | null;
      }[];
    }[];
  };

  for (const r of registrations as unknown as RegistrationRow[]) {
    if (r.guests.length === 0) {
      rows.push(
        [
          r.id,
          r.status,
          r.primary_guest_name,
          r.primary_guest_email,
          r.primary_guest_phone,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          r.subtotal,
          r.donation_total,
          r.total_amount,
          r.payment_method,
          r.created_at,
        ]
          .map(csvEscape)
          .join(",")
      );
      continue;
    }

    for (const guest of r.guests) {
      const lineItems = guest.guest_line_items.length > 0 ? guest.guest_line_items : [null];
      for (const li of lineItems) {
        rows.push(
          [
            r.id,
            r.status,
            r.primary_guest_name,
            r.primary_guest_email,
            r.primary_guest_phone,
            guest.full_name,
            guest.email,
            guest.phone,
            li?.products?.name ?? "",
            li?.quantity ?? "",
            li?.unit_price ?? "",
            li?.line_total ?? "",
            r.subtotal,
            r.donation_total,
            r.total_amount,
            r.payment_method,
            r.created_at,
          ]
            .map(csvEscape)
            .join(",")
        );
      }
    }
  }

  const csv = rows.join("\n");
  const path = `${body.event_id}/${Date.now()}.csv`;

  // exports bucket has no client-facing policies at all -- write via
  // service role, then hand back a short-lived signed URL rather than any
  // direct/public path to the file.
  const serviceClient = createServiceClient();
  const { error: uploadError } = await serviceClient.storage
    .from("exports")
    .upload(path, new Blob([csv], { type: "text/csv" }), { contentType: "text/csv" });

  if (uploadError) {
    return errorResponse(`failed to generate export: ${uploadError.message}`, 500, corsHeaders);
  }

  const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
    .from("exports")
    .createSignedUrl(path, 300); // 5 minutes

  if (signedUrlError || !signedUrlData) {
    return errorResponse(
      `export generated but failed to create a download link: ${signedUrlError?.message}`,
      500,
      corsHeaders
    );
  }

  return jsonResponse(
    { url: signedUrlData.signedUrl, expires_in_seconds: 300 },
    200,
    corsHeaders
  );
});
