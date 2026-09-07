"use client";

import { useSearchParams } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

export function PendingApprovalClient() {
  const searchParams = useSearchParams();
  const isRejected = searchParams.get("status") === "rejected";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center space-y-4 px-4 text-center">
      {isRejected ? (
        <>
          <h1 className="text-2xl font-semibold">Application not approved</h1>
          <p className="text-sm text-gray-600">
            Your company account was not approved. Contact support if you believe this is a
            mistake.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Waiting for approval</h1>
          <p className="text-sm text-gray-600">
            Your company account is set up and waiting for an admin to review it. You&apos;ll be
            able to create events once approved.
          </p>
        </>
      )}
      <LogoutButton />
    </div>
  );
}
