"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getPublicEventWithChildren, publicBookingCache } from "@/lib/queries/public-booking";

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

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      <div>
        <h1 className="text-3xl font-bold">{event.title}</h1>
        {event.description && <p className="mt-2 text-gray-600">{event.description}</p>}
        <p className="mt-1 text-sm text-gray-500">
          {event.start_date && new Date(event.start_date).toLocaleString()}
        </p>
      </div>

      <div className="space-y-4">
        {event.sub_events.map((se) => (
          <div key={se.id} className="rounded-lg border p-4">
            <h2 className="font-medium">{se.title}</h2>
            {se.location && <p className="text-sm text-gray-500">{se.location}</p>}
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
