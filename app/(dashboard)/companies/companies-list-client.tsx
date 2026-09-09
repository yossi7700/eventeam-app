"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { companiesCache, listAllCompanies } from "@/lib/queries/companies";
import { approveCompany } from "@/lib/edge-functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const statusVariants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
  pending: "outline",
  active: "default",
  suspended: "secondary",
  rejected: "destructive",
};

export function CompaniesListClient() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: companies, isPending, error } = useQuery({
    queryKey: companiesCache.listKey,
    queryFn: listAllCompanies,
  });

  const mutation = useMutation({
    mutationFn: approveCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companiesCache.listKey }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">Review and approve company applications.</p>
      </div>

      {isPending && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load companies</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {companies && (
        <div className="grid gap-2">
          {companies.map((company) => (
            <Card key={company.id} className="py-0">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/companies/${company.id}`} className="truncate font-medium hover:underline">
                      {company.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{company.contact_email}</p>
                  </div>
                  <Badge variant={statusVariants[company.status] ?? "outline"} className="shrink-0 capitalize">
                    {company.status}
                  </Badge>
                </div>

                {company.status === "pending" && (
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Button
                      size="sm"
                      onClick={() => mutation.mutate({ company_id: company.id, approve: true })}
                      disabled={mutation.isPending}
                    >
                      <Check className="size-3.5" />
                      Approve
                    </Button>
                    {rejectingId === company.id ? (
                      <>
                        <Input
                          placeholder="Reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="h-8 flex-1 text-xs"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            mutation.mutate({
                              company_id: company.id,
                              approve: false,
                              rejected_reason: rejectReason,
                            });
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          disabled={mutation.isPending}
                        >
                          Confirm reject
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setRejectingId(company.id)}>
                        <X className="size-3.5" />
                        Reject
                      </Button>
                    )}
                  </div>
                )}

                {mutation.error && mutation.variables?.company_id === company.id && (
                  <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
