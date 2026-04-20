"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Loader2, Save, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useSplitRules, useHouseholdMembers, useHouseholds } from "@/lib/api/hooks";
import { patchSplitRules } from "@/lib/api/mutations";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { ApiError } from "@/lib/api/errors";

export function SplitRulesCard() {
  const me = useAuthStore((s) => s.user);
  const currentHhId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHhId);
  const isOwner = !!(me && household && household.createdBy === me.id);

  const { data: rules, isLoading } = useSplitRules();
  const { data: members } = useHouseholdMembers();

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (rules && editingKey !== rules) {
    setEditingKey(rules);
    setEdits({});
  }

  const weights: Record<string, string> = {};
  if (rules) {
    for (const r of rules.rules) {
      weights[r.userId] = edits[r.userId] ?? r.weight.toString();
    }
  }

  const memberName = (id: string) => {
    if (id === me?.id) return "Yo";
    const m = members?.find((x) => x.userId === id);
    return m ? `${m.firstName} ${m.lastName}` : id.slice(0, 8);
  };

  const totalWeight = Object.values(weights).reduce(
    (acc, v) => acc + (Number(v) || 0),
    0,
  );

  const dirty =
    !!rules &&
    rules.rules.some((r) => {
      const n = Number(weights[r.userId]);
      return !Number.isFinite(n) || Math.abs(n - r.weight) > 1e-6;
    });

  const invalid =
    totalWeight <= 0 ||
    Object.values(weights).some((v) => {
      const n = Number(v);
      return !Number.isFinite(n) || n < 0;
    });

  async function handleSave() {
    if (invalid || !rules) return;
    setErr(null);
    setOk(false);
    setSaving(true);
    try {
      await patchSplitRules(
        rules.rules.map((r) => ({ userId: r.userId, weight: Number(weights[r.userId]) })),
      );
      swrMutate(
        (k) =>
          Array.isArray(k) &&
          typeof k[0] === "string" &&
          (k[0].startsWith("/split") || k[0].startsWith("/balances")),
        undefined,
        { revalidate: true },
      );
      setOk(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Reglas de división</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Pesos usados para dividir gastos compartidos cuando no hay override.
            </p>
          </div>
          {!isOwner && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Info className="size-3" /> Solo lectura
            </span>
          )}
        </div>

        {isLoading || !rules ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2">
              {rules.rules.map((r) => {
                const n = Number(weights[r.userId] ?? r.weight);
                const share = totalWeight > 0 && Number.isFinite(n) ? (n / totalWeight) * 100 : 0;
                return (
                  <div key={r.userId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{memberName(r.userId)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {share.toFixed(1)}% del total
                      </div>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled={!isOwner || saving}
                      value={weights[r.userId] ?? ""}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [r.userId]: e.target.value }))
                      }
                      className="h-9 w-24 text-right"
                    />
                  </div>
                );
              })}
            </div>

            {isOwner && (
              <>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Total de pesos: {totalWeight.toFixed(2)}</span>
                  {ok && !dirty && <span className="text-emerald-500">Guardado</span>}
                </div>
                {err && (
                  <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {err}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!dirty || invalid || saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1 size-3.5" />
                    )}
                    Guardar
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
