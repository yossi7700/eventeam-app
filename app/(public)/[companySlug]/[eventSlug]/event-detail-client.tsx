"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicCompanyProfile,
  getPublicEventWithChildren,
  publicBookingCache,
} from "@/lib/queries/public-booking";
import { getSunsetTimes } from "@/lib/edge-functions";
import { resolveActivityTime } from "@/lib/activity-time";

// Gap-audit item: old HomeController::getBookingEventDetail returned
// formatUSAddress(...) + googlemaplink alongside the event, gated on the
// event's "show address" flag (is_show_address, already ported as an
// EventAdvanceSettings override). Builds a single display string from the
// company's structured address fields, matching the old
// formatUSAddress() helper's line breaks.
function formatAddress(company: {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
}): string | null {
  const cityLine = [company.city, company.region, company.postal_code]
    .filter(Boolean)
    .join(", ");
  const lines = [company.address_line1, company.address_line2, cityLine, company.country].filter(
    (line): line is string => !!line
  );
  return lines.length > 0 ? lines.join(", ") : null;
}

export function EventDetailClient({
  companySlug,
  eventSlug,
}: {
  companySlug: string;
  eventSlug: string;
}) {
  const { data: event, isPending } = useQuery({
    queryKey: publicBookingCache.eventKey(companySlug, eventSlug),
    queryFn: () => getPublicEventWithChildren(companySlug, eventSlug),
  });

  const { data: company } = useQuery({
    queryKey: publicBookingCache.companyKey(companySlug),
    queryFn: () => getPublicCompanyProfile(companySlug),
  });

  const hasActivitiesNeedingSunset = (event?.sub_events ?? []).some((se) =>
    se.activities.some((a) => a.activity_type !== "fixed_time")
  );

  const { data: sunsetTimes } = useQuery({
    queryKey: ["sunset-times", event?.id, event?.geonameid, event?.start_date],
    queryFn: () =>
      getSunsetTimes({
        date: (event!.start_date as string).slice(0, 10),
        geonameid: event!.geonameid!,
      }),
    enabled: !!event?.geonameid && !!event?.start_date && hasActivitiesNeedingSunset,
  });

  const sunsetTime = sunsetTimes?.sunset ? new Date(sunsetTimes.sunset) : null;
  const candleLightingTime = sunsetTimes?.candle_lighting
    ? new Date(sunsetTimes.candle_lighting)
    : null;

  if (isPending) {
    return <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-lg bg-gray-100" />;
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">Event not found</h1>
      </div>
    );
  }

  const showAddress = event.advance?.is_show_address ?? false;
  const formattedAddress = company ? formatAddress(company) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">{event.title}</h1>
        {event.description && <p className="mt-2 text-gray-600">{event.description}</p>}
        <p className="mt-1 text-sm text-gray-500">
          {event.start_date && new Date(event.start_date).toLocaleString()}
        </p>
        {showAddress && (formattedAddress || company?.google_maps_url) && (
          <div className="mt-2 text-sm text-gray-500">
            {formattedAddress && <p>{formattedAddress}</p>}
            {company?.google_maps_url && (
              <a
                href={company.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get directions
              </a>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {event.sub_events.map((se) => (
          <div key={se.id} className="rounded-lg border p-4">
            <h2 className="font-medium">{se.title}</h2>
            {se.location && <p className="text-sm text-gray-500">{se.location}</p>}

            {se.activities.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-b pb-2 text-sm text-gray-600">
                {se.activities.map((a) => {
                  const time = resolveActivityTime(a, sunsetTime, candleLightingTime);
                  return (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>{a.title}</span>
                      {time && <span className="text-gray-500">{time}</span>}
                    </li>
                  );
                })}
              </ul>
            )}

            <ul className="mt-3 space-y-1">
              {se.products.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-medium">
                    {p.price} {p.currency}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Link
        href={`/${companySlug}/${eventSlug}/register`}
        className="block w-full rounded-md bg-black px-4 py-3 text-center text-sm font-medium text-white"
      >
        Register
      </Link>
    </div>
  );
}
