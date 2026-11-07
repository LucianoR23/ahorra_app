import { SWRConfig } from "swr";
import { swrFetcher } from "@/lib/api/swr-fetcher";
import type { Household } from "@/lib/api/schemas";

/** "Mi plata" and a hogar as GET /households returns them (plan 1.2). */
export const personalSpace: Household = {
  id: "p1",
  name: "Mi plata",
  baseCurrency: "ARS",
  kind: "personal",
  createdBy: "u1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

export const hogarSpace: Household = {
  id: "h1",
  name: "Casa",
  baseCurrency: "ARS",
  kind: "shared",
  createdBy: "u1",
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

/** SWR with the app's fetcher and a fresh cache per test. */
export function WithSWR({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher: swrFetcher, provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}
