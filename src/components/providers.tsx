"use client";

import { SWRConfig } from "swr";
import { swrFetcher } from "@/lib/api/swr-fetcher";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthBootstrap } from "@/components/auth-bootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <SWRConfig
        value={{
          fetcher: swrFetcher,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <AuthBootstrap />
        {children}
      </SWRConfig>
    </ThemeProvider>
  );
}
