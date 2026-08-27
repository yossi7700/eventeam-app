"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicCompanyProfile,
  listPublicEventsForCompany,
  publicBookingCache,
} from "@/lib/queries/public-booking";

export function CompanyLandingClient({ companySlug }: { companySlug: string }) {
  const { data: company, isPending: companyPending } = useQuery({
    queryKey: publicBookingCache.companyKey(companySlug),
    queryFn: () => getPublicCompanyProfile(companySlug),
  });

  const { data: events, isPending: eventsPending } = useQuery({
    queryKey: ["public", "events", companySlug],
    queryFn: () => listPublicEventsForCompany(companySlug),
  });

  if (companyPending) {
    return <div className="mx-auto h-40 max-w-2xl animate-pulse rounded-lg bg-gray-100" />;
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">Company not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{company.name}</h1>
        {company.about_text && (
          <p className="mt-2 text-gray-600">{company.about_text}</p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Upcoming Events</h2>
        {eventsPending && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}
        {events && events.length === 0 && (
          <p className="text-sm text-gray-500">No upcoming events right now.</p>
        )}
        {events && events.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {events.map((event) => (
              <li key={event.id ?? event.slug}>
                <Link
                  href={`/${companySlug}/${event.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {event.start_date && new Date(event.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
