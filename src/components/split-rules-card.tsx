"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuGroup, MenuItem, MenuRow } from "@/components/ui/menu-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useHouseholdMembers, useHouseholds, useSplitRules } from "@/lib/api/hooks";
import { patchSplitRules } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type Rule = { userId: string; weight: number };

const fmtPct = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? r.toString() : r.toFixed(1);
};

/**
 * "Cómo se dividen los gastos" (plan 1.10b, the grouped list): each member's
 * share; the owner changes them in a sheet. Rules must add up to 100%.
 */
export function SplitRulesCard({ householdId }: { householdId: string }) {
  const me = useAuthStore((s) => s.user);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === householdId);
  const isOwner = !!(me && household && household.createdBy === me.id);
  const { data: rules, isLoading } = useSplitRules(householdId);
  const { data: members } = useHouseholdMembers(householdId);
  const [editing, setEditing] = useState(false);

  // Go sends an empty slice as null (the SWR fetcher does not apply zod defaults).
  const list: Rule[] = rules?.rules ?? [];
  const total = list.reduce((acc, r) => acc + r.weight, 0);
  const pct = (w: number) => (total > 0 ? (w / total) * 100 : 0);
  const name = (id: string) => {
    if (id === me?.id) return "Vos";
    const m = members?.find((x) => x.userId === id);
    return m ? `${m.firstName} ${m.lastName}`.trim() : "Miembro";
  };

  return (
    <>
      <MenuGroup
        title="Cómo se dividen los gastos"
        footer="Se usa en los gastos compartidos que no tienen una división propia."
      >
        {isLoading ? (
          <MenuRow>
            <Skeleton className="h-10 w-full" />
          </MenuRow>
        ) : (
          list.map((r) => (
            <MenuRow key={r.userId}>
              <span className="min-w-0 flex-1 truncate">{name(r.userId)}</span>
              <span className="font-semibold tabular-nums">{fmtPct(pct(r.weight))}%</span>
            </MenuRow>
          ))
        )}
        {isOwner && list.length > 0 && <MenuItem icon={Percent} label="Cambiar la división" onClick={() => setEditing(true)} />}
      </MenuGroup>
      {editing && (
        <SplitSheet householdId={householdId} rules={list} name={name} pct={pct} onOpenChange={setEditing} />
      )}
    </>
  );
}

function SplitSheet({
  householdId,
  rules,
  name,
  pct,
  onOpenChange,
}: {
  householdId: string;
  rules: Rule[];
  name: (id: string) => string;
  pct: (w: number) => number;
  onOpenChange: (v: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rules.map((r) => [r.userId, fmtPct(pct(r.weight))])),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nums = rules.map((r) => Number(values[r.userId]));
  const sum = nums.reduce((a, n) => a + (Number.isFinite(n) ? n : 0), 0);
  const invalid = nums.some((n) => !Number.isFinite(n) || n < 0);
  const sumsTo100 = Math.abs(sum - 100) < 1e-2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !sumsTo100) return;
    setSaving(true);
    setErr(null);
    try {
      await patchSplitRules(
        rules.map((r) => ({ userId: r.userId, weight: Number(values[r.userId]) })),
        householdId,
      );
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && (k[0].startsWith("/split") || k[0].startsWith("/balances")),
        undefined,
        { revalidate: true },
      );
      toast.success("División actualizada");
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cómo se dividen los gastos</DialogTitle>
          <DialogDescription>El porcentaje que le toca a cada uno. Tiene que sumar 100%.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {rules.map((r) => (
            <div key={r.userId} className="flex items-center justify-between gap-4">
              <Label htmlFor={`split-${r.userId}`} className="min-w-0 flex-1 truncate text-body font-normal">
                {name(r.userId)}
              </Label>
              <div className="relative w-28">
                <Input
                  id={`split-${r.userId}`}
                  inputMode="decimal"
                  value={values[r.userId] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [r.userId]: e.target.value.replace(",", ".") }))}
                  disabled={saving}
                  className="pr-8 text-right tabular-nums"
                />
                <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted">
                  %
                </span>
              </div>
            </div>
          ))}
          <p aria-live="polite" className={cn("text-caption", sumsTo100 ? "text-ink-muted" : "text-warn")}>
            Suman {fmtPct(sum)}%{sumsTo100 ? "" : ". Ajustalos para que den 100%."}
          </p>
          {err && (
            <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
              {err}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={invalid || !sumsTo100 || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
