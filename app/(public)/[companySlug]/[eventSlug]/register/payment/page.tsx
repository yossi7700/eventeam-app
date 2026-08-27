import { PaymentClient } from "./payment-client";

export default async function PaymentPage({
  params,
}: PageProps<"/[companySlug]/[eventSlug]/register/payment">) {
  const { companySlug, eventSlug } = await params;
  return <PaymentClient companySlug={companySlug} eventSlug={eventSlug} />;
}
