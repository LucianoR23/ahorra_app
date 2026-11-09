"use client";

import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { CardStatementDetailView } from "@/components/card-statements/card-statement-detail";

export default function Page({ params }: { params: Promise<{ id: string; ym: string }> }) {
  const { id, ym } = use(params);
  return (
    <AppShell>
      <CardStatementDetailView paymentMethodId={id} ym={ym} />
    </AppShell>
  );
}
