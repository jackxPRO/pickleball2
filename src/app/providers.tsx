"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(10,10,10,0.9)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
          },
          success: { iconTheme: { primary: "#d4af37", secondary: "#000" } },
        }}
      />
    </QueryClientProvider>
  );
}
