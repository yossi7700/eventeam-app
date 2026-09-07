"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { OtpGatedAction } from "./otp-gated-action";

export function SecuritySettingsClient() {
  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });

  const [newPassword, setNewPassword] = useState("");
  const [newCommissionPct, setNewCommissionPct] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [commissionChanged, setCommissionChanged] = useState(false);

  const isCompany = profile?.role === "company";

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Security</h1>

      <OtpGatedAction
        purpose="change_password"
        title="Change password"
        description="For your security, a verification code is emailed to you before your password changes."
        initialPayload={{ new_password: "" }}
        onVerified={() => setPasswordChanged(true)}
        renderPayloadFields={(payload, setPayload) => (
          <input
            required
            type="password"
            minLength={8}
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPayload({ ...payload, new_password: e.target.value });
            }}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        )}
      />
      {passwordChanged && (
        <p className="text-sm text-green-700">Password updated successfully.</p>
      )}

      {isCompany && (
        <>
          <OtpGatedAction
            purpose="change_commission_rate"
            title="Change your commission rate"
            description="Changing your platform commission percentage requires verification."
            initialPayload={{ new_commission_pct: 0 }}
            onVerified={() => setCommissionChanged(true)}
            renderPayloadFields={(payload, setPayload) => (
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="New commission % (0-100)"
                value={newCommissionPct}
                onChange={(e) => {
                  setNewCommissionPct(e.target.value);
                  setPayload({ ...payload, new_commission_pct: Number(e.target.value) });
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            )}
          />
          {commissionChanged && (
            <p className="text-sm text-green-700">Commission rate updated successfully.</p>
          )}
        </>
      )}
    </div>
  );
}
