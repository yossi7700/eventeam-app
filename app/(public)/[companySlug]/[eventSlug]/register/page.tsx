import { RegisterFormClient } from "./register-form-client";

export default async function RegisterPage({
  params,
}: PageProps<"/[companySlug]/[eventSlug]/register">) {
  const { companySlug, eventSlug } = await params;
  return <RegisterFormClient companySlug={companySlug} eventSlug={eventSlug} />;
}
