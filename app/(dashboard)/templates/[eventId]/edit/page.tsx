import { EventFormClient } from "../../../events/event-form-client";

export default async function EditTemplatePage({
  params,
}: PageProps<"/templates/[eventId]/edit">) {
  const { eventId } = await params;
  return <EventFormClient mode="edit" eventId={eventId} isTemplate />;
}
