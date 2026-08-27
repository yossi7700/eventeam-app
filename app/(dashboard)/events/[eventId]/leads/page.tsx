import { LeadsClient } from "./leads-client";

export default async function LeadsPage({
  params,
}: PageProps<"/events/[eventId]/leads">) {
  const { eventId } = await params;
  return <LeadsClient eventId={eventId} />;
}
