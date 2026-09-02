import { DonationsClient } from "./donations-client";

export default async function DonationsPage({
  params,
}: PageProps<"/events/[eventId]/donations">) {
  const { eventId } = await params;
  return <DonationsClient eventId={eventId} />;
}
