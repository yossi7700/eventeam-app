import { EventFormClient } from "../../event-form-client";

export default async function EditEventPage({
  params,
}: PageProps<"/events/[eventId]/edit">) {
  const { eventId } = await params;
  return <EventFormClient mode="edit" eventId={eventId} />;
}
