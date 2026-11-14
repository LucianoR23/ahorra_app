"use client";

import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useInboundMessages } from "@/lib/api/hooks";

/**
 * Inicio: "Tenés 2 gastos por mail para revisar" (plan 3.5, decided with the
 * user). Hidden when there is nothing open or import by email is off.
 */
export function InboundPendingCard({ className }: { className?: string }) {
  const { data } = useInboundMessages();
  const n = data?.filter((m) => m.kind === "expense").length ?? 0;
  if (n === 0) return null;
  return (
    <Card className={className}>
      <CardContent>
        <Link href="/gastos-por-mail" className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
            <Mail className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-body font-semibold text-ink">
            {n === 1 ? "Tenés 1 gasto por mail para revisar" : `Tenés ${n} gastos por mail para revisar`}
          </span>
          <ChevronRight className="size-4 text-ink-muted" />
        </Link>
      </CardContent>
    </Card>
  );
}
