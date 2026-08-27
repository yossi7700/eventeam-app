import { EventDetailClient } from "./event-detail-client";

export default async function EventDetailPage({
  params,
}: PageProps<"/[companySlug]/[eventSlug]">) {
  const { companySlug, eventSlug } = await params;
  return <EventDetailClient companySlug={companySlug} eventSlug={eventSlug} />;
}
