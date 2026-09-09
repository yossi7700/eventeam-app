"use client";

import { useSearchParams } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardContent } from "@/components/ui/card";

export function PendingApprovalClient() {
  const searchParams = useSearchParams();
  const isRejected = searchParams.get("status") === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          {isRejected ? (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <XCircle className="size-6" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight">Application not approved</h1>
              <p className="text-sm text-muted-foreground">
                Your company account was not approved. Contact support if you believe this is a
                mistake.
              </p>
            </>
          ) : (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="size-6" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight">Waiting for approval</h1>
              <p className="text-sm text-muted-foreground">
                Your company account is set up and waiting for an admin to review it. You&apos;ll
                be able to create events once approved.
              </p>
            </>
          )}
          <div className="pt-2">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
