import { Suspense } from "react";
import { ConfirmationClient } from "./confirmation-client";

// useSearchParams() (reading ?registration_id=...) requires a Suspense
// boundary in this Next.js version -- same pattern as login/pending-approval
// and settings/payment.
export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationClient />
    </Suspense>
  );
}
