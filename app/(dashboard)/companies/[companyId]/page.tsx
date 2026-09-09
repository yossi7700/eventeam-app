import { CompanyDetailClient } from "./company-detail-client";

export default async function CompanyDetailPage({
  params,
}: PageProps<"/companies/[companyId]">) {
  const { companyId } = await params;
  return <CompanyDetailClient companyId={companyId} />;
}
