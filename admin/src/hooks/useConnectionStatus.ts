import { useSession, useTable, useProject } from "../api/queries";
import { useAdminStore } from "../store/adminStore";

export type ConnectionStatus = "connected" | "retrying" | "failed";

interface ConnectionStatusResult {
  status: ConnectionStatus;
  failureCount: number;
  retryAll: () => void;
}

export function useConnectionStatus(): ConnectionStatusResult {
  const activeTable = useAdminStore((s) => s.activeTable);
  const selectedProjectId = useAdminStore((s) => s.selectedProjectId);

  const sessionQuery = useSession();
  const tableQuery = useTable(activeTable || undefined);
  const projectQuery = useProject(selectedProjectId);

  // Collect all active queries
  const queries = [sessionQuery, ...(activeTable ? [tableQuery] : []), ...(selectedProjectId ? [projectQuery] : [])];

  // Calculate total failure count across all queries
  const failureCount = queries.reduce((sum, q) => sum + (q.failureCount || 0), 0);

  // Determine overall status
  // - connected: All queries succeeded or haven't run yet
  // - retrying: Any query has failures but is still retrying (not in error state)
  // - failed: Any query has exhausted all retries (isError = true)
  const anyFailed = queries.some((q) => q.isError);
  const anyRetrying = queries.some((q) => q.failureCount > 0 && !q.isError && q.isFetching);

  let status: ConnectionStatus;
  if (anyFailed) {
    status = "failed";
  } else if (anyRetrying || failureCount > 0) {
    status = "retrying";
  } else {
    status = "connected";
  }

  // Retry all failed queries
  const retryAll = () => {
    if (sessionQuery.isError) {
      sessionQuery.refetch();
    }
    if (activeTable && tableQuery.isError) {
      tableQuery.refetch();
    }
    if (selectedProjectId && projectQuery.isError) {
      projectQuery.refetch();
    }
  };

  return {
    status,
    failureCount,
    retryAll,
  };
}
