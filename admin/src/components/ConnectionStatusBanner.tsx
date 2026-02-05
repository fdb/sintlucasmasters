import { RefreshCw } from "lucide-react";
import { useConnectionStatus } from "../hooks/useConnectionStatus";

export function ConnectionStatusBanner() {
  const { status, failureCount, retryAll } = useConnectionStatus();

  if (status === "connected") {
    return null;
  }

  if (status === "retrying") {
    return (
      <div className="connection-banner retrying">
        <span>Connection issue. Retrying... (attempt {failureCount})</span>
      </div>
    );
  }

  // status === "failed"
  return (
    <div className="connection-banner failed">
      <span>Connection failed. Please check your network.</span>
      <button type="button" className="connection-retry-btn" onClick={retryAll}>
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  );
}
