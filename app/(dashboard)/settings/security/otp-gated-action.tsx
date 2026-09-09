"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { requestOtp, verifyOtp, type OtpPurpose } from "@/lib/edge-functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {step === "idle" && (
          <>
            {renderPayloadFields(payload, setPayload)}
            {requestMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>{(requestMutation.error as Error).message}</AlertDescription>
              </Alert>
            )}
            <Button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>
              {requestMutation.isPending ? "Sending code..." : "Send verification code"}
            </Button>
          </>
        )}

        {step === "code-sent" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to your email. It expires in 10 minutes.
            </p>
            <Input
              required
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-32 text-center font-mono tracking-widest"
            />
            {verifyMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>{(verifyMutation.error as Error).message}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending || code.length !== 6}>
                {verifyMutation.isPending ? "Verifying..." : "Confirm"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("idle");
                  setCode("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
