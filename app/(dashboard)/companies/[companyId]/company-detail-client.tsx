"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CreditCard, X } from "lucide-react";
import { companiesCache, getCompanyDetail } from "@/lib/queries/companies";
import { approveCompany } from "@/lib/edge-functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const companyStatusVariants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
  pending: "outline",
  active: "default",
  suspended: "secondary",
  rejected: "destructive",
};

const stripeStatusVariants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
  not_connected: "outline",
  onboarding: "secondary",
  restricted: "secondary",
  active: "default",
  disabled: "destructive",
};

const eventStatusVariants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
  draft: "outline",
  active: "default",
  ended: "secondary",
  cancelled: "destructive",
};

export function CompanyDetailClient({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const { data: company, isPending, error } = useQuery({
    queryKey: companiesCache.detailKey(companyId),
    queryFn: () => getCompanyDetail(companyId),
  });

  const approveMutation = useMutation({
    mutationFn: approveCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesCache.detailKey(companyId) });
      queryClient.invalidateQueries({ queryKey: companiesCache.listKey });
    },
  });

  if (isPending) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load company: {error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!company) {
    return <p className="text-sm text-muted-foreground">Company not found.</p>;
  }

  const stripe = company.stripe_accounts;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/companies" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" />
            Back to companies
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
        </div>
        <Badge variant={companyStatusVariants[company.status] ?? "outline"} className="capitalize">
          {company.status}
        </Badge>
      </div>

      {company.status === "pending" && (
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <p className="flex-1 text-sm text-muted-foreground">
              This company is awaiting approval before it can publish events.
            </p>
            <Button
              size="sm"
              onClick={() => approveMutation.mutate({ company_id: company.id, approve: true })}
              disabled={approveMutation.isPending}
            >
              <Check className="size-3.5" />
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                approveMutation.mutate({
                  company_id: company.id,
                  approve: false,
                  rejected_reason: "Rejected from company detail view",
                })
              }
              disabled={approveMutation.isPending}
            >
              <X className="size-3.5" />
              Reject
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Contact email</p>
            <p>{company.contact_email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contact phone</p>
            <p>{company.contact_phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Slug</p>
            <p>{company.slug}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Commission %</p>
            <p>{company.company_settings?.admin_commission_pct ?? "—"}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p>
              {[company.address_line1, company.city, company.region, company.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p>{new Date(company.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-muted-foreground" />
            Stripe Connect
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Badge variant={stripeStatusVariants[stripe?.status ?? "not_connected"] ?? "outline"} className="capitalize">
            {(stripe?.status ?? "not_connected").replace("_", " ")}
          </Badge>
          {stripe?.charges_enabled && <span className="text-xs text-muted-foreground">Charges enabled</span>}
          {stripe?.payouts_enabled && <span className="text-xs text-muted-foreground">Payouts enabled</span>}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {company.events.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="divide-y">
              {company.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <Link href={`/events/${e.id}/edit`} className="font-medium hover:underline">
                    {e.title}
                  </Link>
                  <Badge variant={eventStatusVariants[e.status] ?? "outline"} className="capitalize">
                    {e.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
