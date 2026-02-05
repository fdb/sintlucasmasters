import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App";
import "./index.css";

Sentry.init({
  dsn: "https://940c808bee865bc2ba2d24da4101ef17@o4510688180568064.ingest.de.sentry.io/4510832618831952",
  tunnel: "/api/sentry-tunnel",
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
  tracesSampleRate: 1.0,
});

function ErrorFallback() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Something went wrong</h1>
      <p>An error occurred. It has been reported.</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      refetchInterval: 60_000, // Poll every minute for multi-editor sync
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
