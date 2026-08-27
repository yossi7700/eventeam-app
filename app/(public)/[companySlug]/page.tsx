import { CompanyLandingClient } from "./company-landing-client";

export default async function CompanyLandingPage({
  params,
}: PageProps<"/[companySlug]">) {
  const { companySlug } = await params;
  return <CompanyLandingClient companySlug={companySlug} />;
}
