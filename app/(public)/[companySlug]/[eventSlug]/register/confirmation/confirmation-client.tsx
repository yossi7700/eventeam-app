"use client";

import { useSearchParams } from "next/navigation";

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
    <div className="mx-auto max-w-2xl space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re registered!</h1>
      <p className="text-gray-600">
        A confirmation email is on its way. Thanks for registering.
      </p>
      {registrationId && (
        <p className="text-sm text-gray-500">
          Booking reference:{" "}
          <span className="font-mono font-medium text-gray-700">
            {formatReference(registrationId)}
          </span>
        </p>
      )}
    </div>
  );
}
