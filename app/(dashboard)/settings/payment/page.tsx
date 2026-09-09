import { Suspense } from "react";
import { PaymentSettingsClient } from "./payment-settings-client";

// useSearchParams() (reading the ?code=... OAuth callback param) requires
// a Suspense boundary in this Next.js version -- same pattern as
// login/pending-approval.
export default function PaymentSettingsPage() {
  return (
    <Suspense>
      <PaymentSettingsClient />
    </Suspense>
  );
}
