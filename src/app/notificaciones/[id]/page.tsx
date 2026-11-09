"use client";

import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { InsightDetail } from "@/components/insight-detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <InsightDetail id={id} />
    </AppShell>
  );
}
