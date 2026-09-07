import { Suspense } from "react";
import { PendingApprovalClient } from "./pending-approval-client";

export default function PendingApprovalPage() {
  return (
    <Suspense>
      <PendingApprovalClient />
    </Suspense>
  );
}
