"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// The report charts, loaded on first render instead of with the page
// (plan 0.14). Each placeholder keeps the chart's height so nothing jumps.

export const CategoryBarChart = dynamic(
  () => import("@/components/report-charts").then((m) => m.CategoryBarChart),
  { ssr: false, loading: () => <Skeleton className="h-[120px] w-full rounded-lg" /> },
);

export const DonutChart = dynamic(
  () => import("@/components/report-charts").then((m) => m.DonutChart),
  { ssr: false, loading: () => <Skeleton className="size-[120px] shrink-0 rounded-full" /> },
);

export const TrendsLineChart = dynamic(
  () => import("@/components/report-charts").then((m) => m.TrendsLineChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full rounded-lg" /> },
);
