"use client";

import { useQuery } from "@tanstack/react-query";
import { auditLogsCache, listAuditLogs } from "@/lib/queries/audit-logs";

export function AuditLogClient() {
  const { data: logs, isPending, error } = useQuery({
    queryKey: auditLogsCache.listKey,
    queryFn: listAuditLogs,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Audit Log</h1>

      {isPending && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">
          Failed to load audit log (admin access required): {error.message}
        </p>
      )}

      {logs && logs.length === 0 && (
        <p className="text-sm text-gray-500">No audit log entries yet.</p>
      )}

      {logs && logs.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {logs.map((log) => (
            <li key={log.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{log.action}</span>
                <span className="text-xs text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              {log.target_table && (
                <p className="mt-1 text-xs text-gray-500">
                  {log.target_table} &middot; {log.target_id}
                </p>
              )}
              {log.metadata != null && (
                <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
