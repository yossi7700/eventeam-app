"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { requestOtp, verifyOtp, type OtpPurpose } from "@/lib/edge-functions";

// Generic two-step OTP-gated action: request a code, then submit it along
// with the purpose-specific payload. `renderPayloadFields` lets each usage
// site (password, commission rate, ...) collect its own extra input while
// sharing the request/verify plumbing and error handling.
export function OtpGatedAction<TPayload extends Record<string, unknown>>({
  purpose,
  title,
  description,
  initialPayload,
  renderPayloadFields,
  onVerified,
}: {
  purpose: OtpPurpose;
  title: string;
  description: string;
  initialPayload: TPayload;
  renderPayloadFields: (payload: TPayload, setPayload: (p: TPayload) => void) => React.ReactNode;
  onVerified?: () => void;
}) {
  const [step, setStep] = useState<"idle" | "code-sent">("idle");
  const [code, setCode] = useState("");
  const [payload, setPayload] = useState<TPayload>(initialPayload);

  const requestMutation = useMutation({
    mutationFn: () => requestOtp(purpose),
    onSuccess: () => setStep("code-sent"),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp({ purpose, code, ...payload }),
    onSuccess: () => {
      setStep("idle");
      setCode("");
      onVerified?.();
    },
  });

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-gray-500">{description}</p>
      </div>

      {step === "idle" && (
        <>
          {renderPayloadFields(payload, setPayload)}
          {requestMutation.error && (
            <p className="text-xs text-red-600">{(requestMutation.error as Error).message}</p>
          )}
          <button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {requestMutation.isPending ? "Sending code..." : "Send verification code"}
          </button>
        </>
      )}

      {step === "code-sent" && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Enter the 6-digit code sent to your email. It expires in 10 minutes.
          </p>
          <input
            required
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-32 rounded-md border px-3 py-2 text-center font-mono tracking-widest"
          />
          {verifyMutation.error && (
            <p className="text-xs text-red-600">{(verifyMutation.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending || code.length !== 6}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {verifyMutation.isPending ? "Verifying..." : "Confirm"}
            </button>
            <button
              onClick={() => {
                setStep("idle");
                setCode("");
              }}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
