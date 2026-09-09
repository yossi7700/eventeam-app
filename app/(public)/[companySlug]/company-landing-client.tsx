"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AtSign, CalendarDays, ChevronRight, Globe, PlaySquare } from "lucide-react";
import {
  getPublicCompanyProfile,
  listPublicEventsForCompany,
  publicBookingCache,
} from "@/lib/queries/public-booking";
import { storageUrl } from "@/lib/storage-url";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// lucide-react's brand icon set (Facebook/Instagram/Twitter/Youtube) was
// removed in this installed version -- generic icons stand in per link,
// distinguished by their accessible label rather than a brand mark.
const socialLinks = [
  { key: "website_url" as const, icon: Globe, label: "Website" },
  { key: "facebook_url" as const, icon: AtSign, label: "Facebook" },
  { key: "instagram_url" as const, icon: AtSign, label: "Instagram" },
  { key: "twitter_url" as const, icon: AtSign, label: "Twitter" },
  { key: "youtube_url" as const, icon: PlaySquare, label: "YouTube" },
];

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
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="mx-auto h-8 w-1/2" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">Company not found</h1>
      </div>
    );
  }

  const heroUrl = storageUrl("front-page-assets", company.hero_image_path);
  const logoUrl = storageUrl("company-logos", company.logo_path);
  const accent = company.primary_color || undefined;

  return (
    <div className="min-h-screen">
      {heroUrl ? (
        <div className="relative h-56 w-full overflow-hidden sm:h-72">
          <Image src={heroUrl} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      ) : (
        <div
          className="h-32 w-full sm:h-40"
          style={{
            background: accent
              ? `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent}, black 30%))`
              : "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), black 30%))",
          }}
        />
      )}

      <div className="mx-auto -mt-12 max-w-2xl space-y-8 px-4 pb-16 sm:-mt-14">
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-24 border-4 border-background shadow-md">
            {logoUrl && <AvatarImage src={logoUrl} alt={company.name ?? "Company logo"} />}
            <AvatarFallback className="text-2xl">{company.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">{company.name}</h1>
          {company.about_text && (
            <p className="mt-2 max-w-lg text-muted-foreground">{company.about_text}</p>
          )}

          <div className="mt-4 flex justify-center gap-1">
            {socialLinks
              .filter((s) => company[s.key])
              .map((s) => (
                <a
                  key={s.key}
                  href={company[s.key] as string}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <s.icon className="size-4.5" />
                </a>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Upcoming Events</h2>
          {eventsPending && (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          )}
          {events && events.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No upcoming events right now — check back soon.
              </CardContent>
            </Card>
          )}
          {events && events.length > 0 && (
            <div className="grid gap-2">
              {events.map((event) => (
                <Link key={event.id ?? event.slug} href={`/${companySlug}/${event.slug}`}>
                  <Card className="py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CalendarDays className="size-4.5" />
                        </span>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.start_date &&
                              new Date(event.start_date).toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
