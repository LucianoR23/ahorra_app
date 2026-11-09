"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { Check, ChevronLeft, Pencil } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { CategorySelect } from "@/components/category-select";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useExpense, useHouseholdMembers, useHouseholds, usePaymentMethods } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import { deleteExpense, patchExpense, patchInstallment, type InstallmentPatchInput } from "@/lib/api/mutations";
import type { Expense, Installment } from "@/lib/api/schemas";
import { confirm } from "@/lib/confirm";
import { isoToday } from "@/lib/format";
import { dayMonth } from "@/lib/statements";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const DETALLE_HELP: InfoHelpContent = {
  titulo: "Detalle del gasto",
  acciones: [
    "Editá la descripción, la fecha y la categoría con el lápiz de arriba.",
    "Tocá una cuota para marcarla como pagada o impaga, cambiar sus fechas o ver cómo se divide.",
    "Eliminá el gasto con «Eliminar gasto», al final.",
  ],
  consideraciones: [
    "Eliminar el gasto no se puede deshacer.",
    "El monto, la moneda, las cuotas y el medio de pago no se editan: si te equivocaste, eliminalo y cargalo de nuevo.",
    "Si necesitás una categoría que no aparece en la lista, creala primero en Categorías.",
    "En los gastos del hogar ves cuánto le toca a cada miembro.",
  ],
  relacionado: [
    { label: "Volver a Movimientos", href: "/movimientos" },
    { label: "Categorías", href: "/categorias" },
    { label: "Tarjetas", href: "/tarjetas" },
    { label: "Hogar y miembros", href: "/hogar" },
  ],
};

/** Installments shown before "Ver las N cuotas". */
const VISIBLE = 4;

function refresh() {
  swrMutate(
    (k) =>
      Array.isArray(k) &&
      typeof k[0] === "string" &&
      (k[0].startsWith("/expenses") ||
        k[0].startsWith("/reports") ||
        k[0].startsWith("/balances") ||
        k[0].startsWith("/payment-methods") ||
        k[0].startsWith("/credit-cards")),
    undefined,
    { revalidate: true },
  );
}

/** "15/08/2026" */
function fullDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/**
 * The installment that is due now: the first unpaid one. `progress` is its
 * number ("3 de 12"), or the total when every installment is paid.
 */
export function installmentProgress(installments: Installment[]) {
  const current = installments.find((i) => !i.isPaid);
  const left = installments.filter((i) => !i.isPaid).reduce((sum, i) => sum + i.installmentAmountBase, 0);
  return { current, progress: current?.installmentNumber ?? installments.length, left };
}

/**
 * Rows to show folded: the current installment with the one before it and
 * the next ones, VISIBLE in all.
 */
export function visibleInstallments(installments: Installment[], current?: Installment): Installment[] {
  if (installments.length <= VISIBLE) return installments;
  const at = current ? installments.indexOf(current) : installments.length - 1;
  const start = Math.max(0, Math.min(at - 2, installments.length - VISIBLE));
  return installments.slice(start, start + VISIBLE);
}

/**
 * Detalle (design `Detalle`, plan 1.10b): the expense, its data, the
 * installment schedule, how it splits in the hogar, and "Eliminar gasto".
 */
export function ExpenseDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, error } = useExpense(id);
  const { data: categories } = useCategories();
  const { data: methods } = usePaymentMethods();
  const { data: households } = useHouseholds();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    const ok = await confirm({
      title: "¿Eliminar este gasto?",
      description: "Se borra con todas sus cuotas. No se puede deshacer.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteExpense(id);
      refresh();
      router.replace("/movimientos");
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

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <PageHeader title="Gasto" back={{ href: "/movimientos", label: "Volver a Movimientos" }} />
        <Card>
          <CardContent className="text-center text-body text-ink-muted">
            {error instanceof ApiError ? error.message : "No se pudo cargar el gasto."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { expense, installments } = data;
  const category = categories?.find((c) => c.id === expense.categoryId);
  const method = methods?.find((p) => p.id === expense.paymentMethodId);
  const space = households?.find((h) => h.id === expense.householdId);
  const foreign = expense.currency !== expense.baseCurrency;
  const many = installments.length > 1;
  const schedule = many || method?.kind === "credit";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="icon" aria-label="Volver a Movimientos" nativeButton={false} render={<Link href="/movimientos" />}>
          <ChevronLeft aria-hidden strokeWidth={1.75} />
        </Button>
        <div className="flex items-center gap-2">
          <InfoHelp content={DETALLE_HELP} size="icon" />
          <Button variant="secondary" size="icon" aria-label="Editar gasto" onClick={() => setEditing(true)}>
            <Pencil aria-hidden strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <CategoryIcon icon={category?.icon} size={64} className="mb-2" />
        <h1 className="text-title font-bold text-ink">{expense.description}</h1>
        <p className="text-display font-bold">
          <Money amount={expense.amount} currency={expense.currency} />
        </p>
        {(many || foreign) && (
          <p className="text-body text-ink-muted">
            {many && (
              <>
                {installments.length} cuotas de <Money amount={installments[0].installmentAmount} currency={expense.currency} />
              </>
            )}
            {many && foreign && " · "}
            {foreign && (
              <>
                ≈ <Money amount={expense.amountBase} currency={expense.baseCurrency} />
              </>
            )}
          </p>
        )}
      </div>

      <Card className="py-1">
        <CardContent>
          <dl className="divide-y divide-border">
            <InfoRow label="Categoría" value={category?.name ?? "Sin categoría"} />
            <InfoRow label="Pago" value={method?.name ?? "Medio de pago borrado"} />
            <InfoRow label="Fecha de compra" value={fullDate(expense.spentAt)} />
            <InfoRow label="Espacio" value={space ? (space.kind === "personal" ? "Mi plata" : space.name) : "—"} />
            {expense.recurringExpenseId && <InfoRow label="Origen" value="Gasto fijo" />}
          </dl>
        </CardContent>
      </Card>

      {schedule && <Schedule expense={expense} installments={installments} />}
      <Split householdId={expense.householdId} installments={installments} currency={expense.baseCurrency} />

      <Button
        variant="ghost"
        className="self-center text-negative hover:bg-negative-soft hover:text-negative"
        onClick={onDelete}
        disabled={deleting}
      >
        {deleting ? "Eliminando…" : "Eliminar gasto"}
      </Button>

      {editing && <EditExpenseDialog expense={expense} categories={categories ?? []} onOpenChange={setEditing} />}
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

/** "Cuotas": progress, what is left and the schedule, folded to four rows. */
function Schedule({ expense, installments }: { expense: Expense; installments: Installment[] }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<Installment | null>(null);
  const { current, progress, left } = installmentProgress(installments);
  const rows = all ? installments : visibleInstallments(installments, current);
  const today = isoToday();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-heading font-semibold">{installments.length > 1 ? "Cuotas" : "Cuota"}</h2>
          <p className="text-caption text-ink-muted">
            {current ? (
              <>
                {progress} de {installments.length} · faltan <Money amount={left} currency={expense.baseCurrency} />
              </>
            ) : (
              "Todas pagadas"
            )}
          </p>
        </div>
        {installments.length > 1 && (
          <div aria-hidden className="flex gap-1">
            {installments.map((i) => (
              <span key={i.id} className={cn("h-2 flex-1 rounded-full", i.isPaid || i === current ? "bg-brand" : "bg-border")} />
            ))}
          </div>
        )}
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((i) => {
            const date = i.dueDate ?? i.billingDate;
            const now = i === current;
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`Cuota ${i.installmentNumber}`}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-4 py-3 text-left text-body outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="w-6 shrink-0 text-ink-muted">{i.installmentNumber}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block", now ? "font-semibold text-ink" : "text-ink-muted")}>
                      {date ? `Vence ${dayMonth(date)}` : "Sin fecha"}
                    </span>
                    {now && i.billingDate && (
                      <span className="block text-caption text-ink-muted">
                        {i.billingDate <= today ? "En el resumen a pagar" : "En el resumen abierto"}
                      </span>
                    )}
                  </span>
                  {i.isPaid ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-positive">
                      <Check aria-hidden className="size-4" strokeWidth={2} /> Pagada
                    </span>
                  ) : now ? (
                    <Badge className="h-8 bg-brand-soft px-3 text-body text-ink">Ahora</Badge>
                  ) : (
                    <Money amount={i.installmentAmount} currency={expense.currency} className="text-ink-muted" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {installments.length > VISIBLE && (
          <Button variant="ghost" className="self-center text-brand-ink" onClick={() => setAll(!all)}>
            {all ? "Ver menos" : `Ver las ${installments.length} cuotas`}
          </Button>
        )}
      </CardContent>
      {open && (
        <InstallmentDialog
          key={open.id}
          expense={expense}
          installment={open}
          onOpenChange={(o) => !o && setOpen(null)}
        />
      )}
    </Card>
  );
}

/** "Cómo se divide": each member's part of the whole expense, in the hogar. */
function Split({ householdId, installments, currency }: { householdId: string; installments: Installment[]; currency: string }) {
  // The expense's space, which may not be the one open.
  const { data: members } = useHouseholdMembers(householdId);
  const parts = new Map<string, number>();
  for (const i of installments) for (const s of i.shares) parts.set(s.userId, (parts.get(s.userId) ?? 0) + s.amountBaseOwed);
  if (parts.size === 0) return null;
  const name = (uid: string) => members?.find((m) => m.userId === uid)?.firstName || "Un ex miembro";

  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <h2 className="text-heading font-semibold">Cómo se divide</h2>
        <dl className="divide-y divide-border">
          {[...parts].map(([uid, amount]) => (
            <InfoRow key={uid} label={name(uid)} value={<Money amount={amount} currency={currency} />} />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/** One installment: mark it paid or unpaid, fix its dates, see its split. */
function InstallmentDialog({
  expense,
  installment,
  onOpenChange,
}: {
  expense: Expense;
  installment: Installment;
  onOpenChange: (open: boolean) => void;
}) {
  const [billingDate, setBillingDate] = useState(installment.billingDate ?? "");
  const [dueDate, setDueDate] = useState(installment.dueDate ?? "");
  const [busy, setBusy] = useState(false);
  const datesChanged = billingDate !== (installment.billingDate ?? "") || dueDate !== (installment.dueDate ?? "");

  async function apply(input: InstallmentPatchInput, done: string) {
    setBusy(true);
    try {
      await patchInstallment(expense.id, installment.installmentNumber, input);
      refresh();
      toast.success(done);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo actualizar");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Cuota {installment.installmentNumber} de {expense.installments}
          </DialogTitle>
          <DialogDescription>
            <Money amount={installment.installmentAmount} currency={expense.currency} /> · {installment.isPaid ? "Pagada" : "Sin pagar"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Resumen</Label>
            <DatePicker value={billingDate} onChange={setBillingDate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Vencimiento</Label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>
        </div>
        <DialogFooter>
          {datesChanged ? (
            <Button
              disabled={busy}
              onClick={() => apply({ billingDate: billingDate || null, dueDate: dueDate || null }, "Fechas guardadas")}
            >
              Guardar fechas
            </Button>
          ) : (
            <Button
              variant={installment.isPaid ? "outline" : "default"}
              disabled={busy}
              onClick={() => apply({ isPaid: !installment.isPaid }, installment.isPaid ? "Cuota marcada sin pagar" : "Cuota pagada")}
            >
              {installment.isPaid ? "Marcar sin pagar" : "Marcar pagada"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The pencil: description, date and category (the rest can't change). */
function EditExpenseDialog({
  expense,
  categories,
  onOpenChange,
}: {
  expense: Expense;
  categories: { id: string; name: string; parentId?: string | null }[];
  onOpenChange: (open: boolean) => void;
}) {
  const [description, setDescription] = useState(expense.description);
  const [spentAt, setSpentAt] = useState(expense.spentAt.slice(0, 10));
  const [categoryId, setCategoryId] = useState(expense.categoryId ?? "");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    try {
      await patchExpense(expense.id, { description: description.trim(), spentAt, categoryId: categoryId || null });
      refresh();
      toast.success("Gasto actualizado");
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
          <DialogTitle>Editar gasto</DialogTitle>
          <DialogDescription>El monto, las cuotas y el medio de pago no se cambian.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">Descripción</Label>
            <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fecha de compra</Label>
            <DatePicker value={spentAt} onChange={setSpentAt} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Categoría</Label>
            <CategorySelect value={categoryId} onValueChange={setCategoryId} categories={categories} emptyLabel="Sin categoría" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !description.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
