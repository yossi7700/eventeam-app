import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type AuditLog = Tables<"audit_logs">;

export const auditLogsCache = {
  listKey: ["audit_logs"] as const,
};

export async function listAuditLogs(): Promise<AuditLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return data;
}
