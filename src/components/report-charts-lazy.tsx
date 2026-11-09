"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// The trends chart, loaded on first render instead of with the page
// (plan 0.14). The placeholder keeps its height so nothing jumps.

export const TrendsLineChart = dynamic(
  () => import("@/components/report-charts").then((m) => m.TrendsLineChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full rounded-lg" /> },
);
