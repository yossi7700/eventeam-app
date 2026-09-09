"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Trash2 } from "lucide-react";
import {
  addTemplateToEvent,
  createDonationField,
  deleteDonationField,
  donationFieldsCache,
  donationTemplatesCache,
  listDonationFields,
  listDonationTemplates,
  updateDonationField,
} from "@/lib/queries/donations";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DonationsClient({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [allowCustom, setAllowCustom] = useState(true);

  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });
  const companyId = profile?.companies?.id ?? null;

  const { data: fields, isPending, error } = useQuery({
    queryKey: donationFieldsCache.listKey(eventId),
    queryFn: () => listDonationFields(eventId),
  });

  const { data: templates } = useQuery({
    queryKey: companyId ? donationTemplatesCache.listKey(companyId) : ["donation_field_templates", "none"],
    queryFn: () => listDonationTemplates(companyId!),
    enabled: !!companyId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: donationFieldsCache.listKey(eventId) });

  const createMutation = useMutation({
    mutationFn: createDonationField,
    onSuccess: () => {
      invalidate();
      setTitle("");
      setSuggestedAmount("");
    },
  });

  const addFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) => {
      const template = templates?.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");
      return addTemplateToEvent(eventId, template, fields?.length ?? 0);
    },
    onSuccess: invalidate,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateDonationField(id, { is_active }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDonationField,
    onSuccess: invalidate,
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      event_id: eventId,
      title,
      suggested_amount: suggestedAmount ? Number(suggestedAmount) : null,
      allow_custom_amount: allowCustom,
      sort_order: fields?.length ?? 0,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Donation Fields</h1>

      {isPending && <Skeleton className="h-24 w-full rounded-xl" />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {fields && fields.length > 0 && (
        <div className="grid gap-2">
          {fields.map((f) => (
            <Card key={f.id} className="py-0">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Heart className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">{f.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.suggested_amount ? `Suggested: $${f.suggested_amount}` : "No suggested amount"}
                      {f.allow_custom_amount ? " · custom amount allowed" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({ id: f.id, is_active: !f.is_active })}
                  >
                    {f.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(f.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {templates && templates.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Add from your donation catalog</CardTitle>
            <Link href="/settings/company" className="text-xs text-muted-foreground hover:text-foreground">
              Manage catalog
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {templates
                .filter((t) => !fields?.some((f) => f.template_id === t.id))
                .map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => addFromTemplateMutation.mutate(t.id)}
                    disabled={addFromTemplateMutation.isPending}
                  >
                    <Plus className="size-3" />
                    {t.title}
                  </Button>
                ))}
            </div>
            {addFromTemplateMutation.error && (
              <p className="text-xs text-destructive">
                {(addFromTemplateMutation.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Add a one-off donation field</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Suggested amount (optional)"
                value={suggestedAmount}
                onChange={(e) => setSuggestedAmount(e.target.value)}
                className="flex-1"
              />
              <Label htmlFor="donation-custom" className="flex items-center gap-2 whitespace-nowrap text-sm font-normal">
                <Checkbox
                  id="donation-custom"
                  checked={allowCustom}
                  onCheckedChange={(checked) => setAllowCustom(checked === true)}
                />
                Allow custom amount
              </Label>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
