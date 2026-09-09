"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import {
  EMAIL_TEMPLATE_KINDS,
  emailTemplatesCache,
  listEmailTemplates,
  upsertEmailTemplate,
  type EmailTemplate,
} from "@/lib/queries/email-templates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const kindLabels: Record<(typeof EMAIL_TEMPLATE_KINDS)[number], string> = {
  registration_confirmation: "Registration Confirmation",
  thank_you: "Thank You",
  company_signup: "Company Signup",
  company_approved: "Company Approved",
  company_rejected: "Company Rejected",
};

// The exact variables each kind is actually sent with, taken from every
// invokeEmailFunction call site (register-guest, stripe-webhook,
// approve-company, request-otp's thank-you cron) -- not a guessed/aspirational
// list. A variable not in this list for a given kind will render literally
// as "{{whatever}}" rather than being replaced.
const kindVariables: Record<(typeof EMAIL_TEMPLATE_KINDS)[number], string[]> = {
  registration_confirmation: ["guest_name", "event_title", "total_amount", "currency"],
  thank_you: ["guest_name", "event_title"],
  company_signup: ["company_name"],
  company_approved: ["company_name"],
  company_rejected: ["company_name", "rejected_reason"],
};

function TemplateForm({
  companyId,
  kind,
  existing,
}: {
  companyId: string;
  kind: (typeof EMAIL_TEMPLATE_KINDS)[number];
  existing: EmailTemplate | undefined;
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(existing?.body_html ?? "");
  const [ccEmails, setCcEmails] = useState((existing?.cc_emails ?? []).join(", "));

  const saveMutation = useMutation({
    mutationFn: upsertEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplatesCache.listKey(companyId) });
      toast.success("Template saved.");
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cc_emails = ccEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    saveMutation.mutate({ company_id: companyId, kind, subject, body_html: bodyHtml, cc_emails });
  }

  const variables = kindVariables[kind];

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Available variables for this email:{" "}
            {variables.map((v) => (
              <code key={v} className="mr-1 rounded bg-muted px-1 py-0.5 text-[11px]">
                {`{{${v}}}`}
              </code>
            ))}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="et-subject">Subject</Label>
            <Input id="et-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-body">HTML body</Label>
            <Textarea
              id="et-body"
              required
              rows={12}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-cc">CC additional recipients</Label>
            <p className="text-xs text-muted-foreground">
              Comma-separated, added to every email of this type
            </p>
            <Input
              id="et-cc"
              placeholder="manager@example.com, office@example.com"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
            />
          </div>
          {saveMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>{(saveMutation.error as Error).message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function EmailTemplatesClient() {
  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });
  const companyId = profile?.companies?.id ?? null;

  const { data: templates, isPending, error } = useQuery({
    queryKey: emailTemplatesCache.listKey(companyId),
    queryFn: () => listEmailTemplates(companyId!),
    enabled: !!companyId,
  });

  const [activeKind, setActiveKind] = useState<(typeof EMAIL_TEMPLATE_KINDS)[number]>(
    "registration_confirmation"
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Email Templates</h1>

      <Tabs value={activeKind} onValueChange={(v) => setActiveKind(v as typeof activeKind)}>
        <TabsList className="h-auto flex-wrap">
          {EMAIL_TEMPLATE_KINDS.map((kind) => (
            <TabsTrigger key={kind} value={kind}>
              {kindLabels[kind]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isPending && <Skeleton className="h-64 w-full rounded-xl" />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {companyId && templates && (
        <TemplateForm
          // Remounts the form (with fresh initial state) whenever the
          // selected kind or the loaded templates change, rather than an
          // effect reaching back to imperatively resync state.
          key={activeKind}
          companyId={companyId}
          kind={activeKind}
          existing={templates.find((t) => t.kind === activeKind)}
        />
      )}
    </div>
  );
}
