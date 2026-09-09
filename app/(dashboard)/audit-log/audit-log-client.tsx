"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { auditLogsCache, listAuditLogs } from "@/lib/queries/audit-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function AuditLogClient() {
  const { data: logs, isPending, error } = useQuery({
    queryKey: auditLogsCache.listKey,
    queryFn: listAuditLogs,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          A record of approvals, sensitive changes, and payment status updates.
        </p>
      </div>

      {isPending && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load audit log (admin access required): {error.message}
          </AlertDescription>
        </Alert>
      )}

      {logs && logs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <ScrollText className="size-6" />
            No audit log entries yet.
          </CardContent>
        </Card>
      )}

      {logs && logs.length > 0 && (
        <div className="grid gap-2">
          {logs.map((log) => (
            <Card key={log.id} className="py-0">
              <CardContent className="space-y-1.5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {log.action}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                {log.target_table && (
                  <p className="text-xs text-muted-foreground">
                    {log.target_table} &middot; {log.target_id}
                  </p>
                )}
                {log.metadata != null && (
                  <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
