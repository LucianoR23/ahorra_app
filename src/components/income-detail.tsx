"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { ArrowLeft, Trash2, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIncome, useHouseholdMembers } from "@/lib/api/hooks";
import { deleteIncome, patchIncome } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { fmtMoney, fmtDateShort } from "@/lib/format";

export function IncomeDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: income, isLoading, error } = useIncome(id);
  const { data: members } = useHouseholdMembers();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    swrMutate(
      (k) => Array.isArray(k) && typeof k[0] === "string" && (k[0].startsWith("/incomes") || k[0].startsWith("/totals") || k[0].startsWith("/reports")),
      undefined,
      { revalidate: true },
    );
  }

  async function onDelete() {
    if (!confirm("¿Eliminar este ingreso?")) return;
    setDeleting(true);
    try {
      await deleteIncome(id);
      refresh();
      router.replace("/ingresos");
    } catch (e) {
      setDeleting(false);
      alert(e instanceof ApiError ? e.message : "No se pudo eliminar");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }
  if (error || !income) {
    return (
      <div className="space-y-3">
        <Link href="/ingresos" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Ingresos
        </Link>
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No se pudo cargar.
          </CardContent>
        </Card>
      </div>
    );
  }

  const receiver = members?.find((m) => m.userId === income.receivedBy);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/ingresos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Ingresos
      </Link>

      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold tracking-tight">
                {income.description || income.source}
              </h1>
              <div className="mt-1 text-xs text-muted-foreground">
                {income.source} · Para {receiver ? `${receiver.firstName} ${receiver.lastName}` : "—"} · {fmtDateShort(income.receivedAt)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-xl font-bold text-positive">
                +{fmtMoney(income.amountBase, income.baseCurrency, { decimals: 0 })}
              </div>
              {income.currency !== income.baseCurrency && (
                <div className="text-[11px] text-muted-foreground">
                  {fmtMoney(income.amount, income.currency, { decimals: 0 })}
                  {income.rateUsed && ` @ ${income.rateUsed.toFixed(2)}`}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="flex-1">
              <Edit3 className="size-3" /> {editing ? "Cancelar" : "Editar"}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting} className="flex-1">
              <Trash2 className="size-3" /> {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <EditIncome
          income={income}
          onSaved={() => { setEditing(false); refresh(); }}
        />
      )}
    </div>
  );
}

function EditIncome({
  income,
  onSaved,
}: {
  income: { id: string; source: string; description?: string | null; receivedAt: string };
  onSaved: () => void;
}) {
  const [source, setSource] = useState(income.source);
  const [description, setDescription] = useState(income.description ?? "");
  const [receivedAt, setReceivedAt] = useState(income.receivedAt);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await patchIncome(income.id, { source, description, receivedAt });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Error");
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label>Fuente</Label>
          <Input value={source} onChange={(e) => setSource(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="h-9" />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button onClick={save} disabled={saving} size="sm" className="w-full">
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  );
}
