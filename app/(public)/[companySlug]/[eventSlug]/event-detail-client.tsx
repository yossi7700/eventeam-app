"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import {
  getPublicCompanyProfile,
  getPublicEventWithChildren,
  publicBookingCache,
} from "@/lib/queries/public-booking";
import { getSunsetTimes } from "@/lib/edge-functions";
import { resolveActivityTime } from "@/lib/activity-time";
import { storageUrl } from "@/lib/storage-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

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
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
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
  const coverUrl = storageUrl("event-images", event.cover_image_path);

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-28">
      {coverUrl ? (
        <div className="relative -mx-4 h-56 overflow-hidden sm:mx-0 sm:h-72 sm:rounded-2xl">
          <Image src={coverUrl} alt="" fill priority className="object-cover" />
        </div>
      ) : (
        <div className="-mx-4 h-8 sm:mx-0" />
      )}

      <div className="space-y-2 px-4 sm:px-0">
        <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
        {event.description && <p className="text-muted-foreground">{event.description}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
          {event.start_date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {new Date(event.start_date).toLocaleString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          {showAddress && formattedAddress && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {formattedAddress}
              {company?.google_maps_url && (
                <a
                  href={company.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  (directions)
                </a>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 sm:px-0">
        {event.sub_events.map((se) => (
          <Card key={se.id}>
            <CardContent className="space-y-3">
              <div>
                <h2 className="font-semibold">{se.title}</h2>
                {se.location && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {se.location}
                  </p>
                )}
              </div>

              {se.activities.length > 0 && (
                <>
                  <Separator />
                  <ul className="space-y-1.5 text-sm">
                    {se.activities.map((a) => {
                      const time = resolveActivityTime(a, sunsetTime, candleLightingTime);
                      return (
                        <li key={a.id} className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5" />
                            {a.title}
                          </span>
                          {time && <span className="font-medium text-foreground">{time}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {se.products.length > 0 && (
                <>
                  <Separator />
                  <ul className="space-y-1.5 text-sm">
                    {se.products.map((p) => (
                      <li key={p.id} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {p.color && (
                            <span
                              aria-hidden
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                          )}
                          {p.name}
                        </span>
                        <span className="font-medium">
                          {p.price} {p.currency}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-2xl">
          <Button render={<Link href={`/${companySlug}/${eventSlug}/register`} />} size="lg" className="w-full">
            <Ticket />
            Register
          </Button>
        </div>
      </div>
    </div>
  );
}
