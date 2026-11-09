"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { ChevronLeft, Pencil } from "lucide-react";
import { IncomeIcon } from "@/components/incomes-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useHouseholdMembers, useHouseholds, useIncome, usePaymentMethods } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import { deleteIncome, patchIncome } from "@/lib/api/mutations";
import type { Income } from "@/lib/api/schemas";
import { confirm } from "@/lib/confirm";
import { INCOME_SOURCES, incomeSourceLabel } from "@/lib/labels";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth";

const INGRESO_DETALLE_HELP: InfoHelpContent = {
  titulo: "Detalle del ingreso",
  acciones: [
    "Editá la fuente, la descripción y la fecha con el lápiz de arriba.",
    "Eliminá el ingreso con «Eliminar ingreso», al final, si lo cargaste por error.",
  ],
  consideraciones: [
    "El monto, la moneda y quién lo recibió no se cambian: si te equivocaste, eliminalo y cargalo de nuevo.",
    "Eliminar un ingreso no se puede deshacer.",
  ],
  relacionado: [
    { label: "Volver a Ingresos", href: "/ingresos" },
    { label: "Recurrentes", href: "/recurrentes" },
  ],
};

function refresh() {
  swrMutate(
    (k) =>
      Array.isArray(k) &&
      typeof k[0] === "string" &&
      (k[0].startsWith("/incomes") || k[0].startsWith("/totals") || k[0].startsWith("/reports")),
    undefined,
    { revalidate: true },
  );
}

/** "15/08/2026" */
function fullDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Detalle del ingreso (plan 1.10b, no design: the `Detalle` pattern). */
export function IncomeDetailView({ id }: { id: string }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.user?.id);
  const { data: income, isLoading, error } = useIncome(id);
  const { data: households } = useHouseholds();
  const { data: members } = useHouseholdMembers(income?.householdId ?? null);
  const { data: methods } = usePaymentMethods();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    const ok = await confirm({
      title: "¿Eliminar este ingreso?",
      description: "No se puede deshacer.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteIncome(id);
      refresh();
      router.replace("/ingresos");
    } catch (e) {
      setDeleting(false);
      toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }
  if (error || !income) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <PageHeader title="Ingreso" back={{ href: "/ingresos", label: "Volver a Ingresos" }} />
        <Card>
          <CardContent className="text-center text-body text-ink-muted">
            {error instanceof ApiError ? error.message : "No se pudo cargar el ingreso."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const receiver = income.receivedBy === me ? "Vos" : members?.find((m) => m.userId === income.receivedBy)?.firstName;
  const space = households?.find((h) => h.id === income.householdId);
  const account = income.paymentMethodId ? methods?.find((p) => p.id === income.paymentMethodId)?.name : undefined;
  const foreign = income.currency !== income.baseCurrency;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="icon" aria-label="Volver a Ingresos" nativeButton={false} render={<Link href="/ingresos" />}>
          <ChevronLeft aria-hidden strokeWidth={1.75} />
        </Button>
        <div className="flex items-center gap-2">
          <InfoHelp content={INGRESO_DETALLE_HELP} size="icon" />
          <Button variant="secondary" size="icon" aria-label="Editar ingreso" onClick={() => setEditing(true)}>
            <Pencil aria-hidden strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <span className="mb-2">
          <IncomeIcon size={64} />
        </span>
        <h1 className="text-title font-bold text-ink">{income.description || incomeSourceLabel(income.source)}</h1>
        <p className="text-display font-bold">
          <Money amount={income.amount} currency={income.currency} income />
        </p>
        {foreign && (
          <p className="text-body text-ink-muted">
            ≈ <Money amount={income.amountBase} currency={income.baseCurrency} />
          </p>
        )}
      </div>

      <Card className="py-1">
        <CardContent>
          <dl className="divide-y divide-border">
            <InfoRow label="Fuente" value={incomeSourceLabel(income.source)} />
            <InfoRow label="Fecha" value={fullDate(income.receivedAt)} />
            {receiver && (members?.length ?? 0) > 1 && <InfoRow label="Lo recibió" value={receiver} />}
            <InfoRow label="Cuenta" value={account ?? "Sin especificar"} />
            <InfoRow label="Espacio" value={space ? (space.kind === "personal" ? "Mi plata" : space.name) : "—"} />
          </dl>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        className="self-center text-negative hover:bg-negative-soft hover:text-negative"
        onClick={onDelete}
        disabled={deleting}
      >
        {deleting ? "Eliminando…" : "Eliminar ingreso"}
      </Button>

      {editing && <EditIncomeDialog income={income} onOpenChange={setEditing} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3 text-body">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

const isPreset = (s: string) => (INCOME_SOURCES as readonly string[]).includes(s) && s !== "other";

/** The pencil: source, description and date. */
function EditIncomeDialog({ income, onOpenChange }: { income: Income; onOpenChange: (open: boolean) => void }) {
  const [source, setSource] = useState(income.source);
  const [custom, setCustom] = useState(!isPreset(income.source));
  const [description, setDescription] = useState(income.description ?? "");
  const [receivedAt, setReceivedAt] = useState(income.receivedAt.slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!source.trim()) return;
    setSaving(true);
    try {
      await patchIncome(income.id, { source: source.trim(), description: description.trim(), receivedAt });
      refresh();
      toast.success("Ingreso actualizado");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar ingreso</DialogTitle>
          <DialogDescription>El monto y quién lo recibió no se cambian.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-source">Fuente</Label>
            <Select
              value={custom ? "other" : source}
              onValueChange={(v) => {
                const next = v ?? "other";
                setCustom(next === "other");
                setSource(next === "other" ? "" : next);
              }}
            >
              <SelectTrigger id="edit-source">
                <SelectValue>{(v: string | null) => (v ? incomeSourceLabel(v) : "")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INCOME_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {incomeSourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {custom && (
              <Input aria-label="Otra fuente" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ej: alquiler" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">Descripción</Label>
            <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fecha</Label>
            <DatePicker value={receivedAt} onChange={setReceivedAt} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !source.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
