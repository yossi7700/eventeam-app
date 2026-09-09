"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Gap-audit item: old system's Registration.reg_id ("REG-xxxxxxxxxx", see
// generateRegNumber() in app/Helpers/helper.php) gave guests a short,
// human-readable booking reference distinct from the internal id. This
// page previously showed nothing at all -- not even the internal id --
// so a guest had no reference to quote if they needed support. Rather
// than porting the old random-string-with-collision-retry generator (our
// registrations.id is already a globally unique UUID, so no new column or
// generation logic is needed), this derives a short display code from the
// existing id's first segment.
function formatReference(registrationId: string): string {
  return `REG-${registrationId.slice(0, 8).toUpperCase()}`;
}

export function ConfirmationClient() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("registration_id");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;re registered!</h1>
          <p className="text-muted-foreground">
            A confirmation email is on its way. Thanks for registering.
          </p>
          {registrationId && (
            <Badge variant="secondary" className="mt-2 font-mono text-sm">
              {formatReference(registrationId)}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
