"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth";
import { useAdminDeletedHouseholds } from "@/lib/api/hooks";
import {
  purgeAdminHousehold,
  restoreAdminHousehold,
  generateInsights,
} from "@/lib/api/mutations";
import type { AdminDeletedHousehold } from "@/lib/api/schemas";
import { toast, toastError } from "@/lib/toast";

function invalidate() {
  swrMutate(
    (k) =>
      Array.isArray(k) &&
      typeof k[0] === "string" &&
      (k[0].startsWith("/admin/") || k[0].startsWith("/households")),
    undefined,
    { revalidate: true },
  );
}

export function AdminPanel() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  if (!user.isSuperadmin) {
    return (
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-destructive">Acceso denegado</h2>
              <p className="text-[11px] text-muted-foreground">
                Esta sección es exclusiva para superadmins.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Superadmin</h2>
              <p className="text-[11px] text-muted-foreground">
                Sesión iniciada como <span className="font-semibold">{user.email}</span>. Este
                rol es independiente del rol por-hogar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <GenerateInsightsCard />
      <DeletedHouseholdsCard />
    </div>
  );
}

function GenerateInsightsCard() {
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState<string>("");
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  async function handle() {
    setBusy(true);
    setResult(null);
    try {
      const r = await generateInsights(at || undefined);
      setResult(r);
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/insights"),
        undefined,
        { revalidate: true },
      );
      toast.success(`Insights generados (${r.created} creados, ${r.failed} fallidos)`);
    } catch (e) {
      toastError(e, "No se pudieron generar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-ai/10 text-ai">
            <Sparkles className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Regenerar insights</h2>
            <p className="text-[11px] text-muted-foreground">
              Ejecuta el pipeline de generación para todos los hogares. Útil para probar cambios del motor.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="insights-at" className="text-xs">
              Fecha (opcional)
            </Label>
            <Input
              id="insights-at"
              type="date"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Vacío = hoy. Formato YYYY-MM-DD.
            </p>
          </div>
          <Button type="button" onClick={handle} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-3.5" />
            )}
            Generar ahora
          </Button>
        </div>

        {result && (
          <div className="mt-3 flex gap-2 text-xs">
            <Badge className="bg-positive/15 text-positive border-0">
              {result.created} creados
            </Badge>
            {result.failed > 0 && (
              <Badge className="bg-destructive/15 text-destructive border-0">
                {result.failed} fallidos
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeletedHouseholdsCard() {
  const { data, isLoading, error } = useAdminDeletedHouseholds();

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="mb-3">
          <h2 className="text-sm font-bold">Hogares soft-deleted</h2>
          <p className="text-[11px] text-muted-foreground">
            Hogares marcados como borrados por sus owners. Podés restaurarlos o purgarlos
            definitivamente (cascade).
          </p>
        </div>

        {isLoading && <Skeleton className="h-24 w-full rounded-md" />}

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            No se pudo cargar la lista.
          </div>
        )}

        {!isLoading && !error && (!data || data.length === 0) && (
          <p className="rounded-md bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
            No hay hogares soft-deleted.
          </p>
        )}

        {data && data.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.map((h) => (
              <DeletedHouseholdRow key={h.id} household={h} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeletedHouseholdRow({ household }: { household: AdminDeletedHousehold }) {
  const deletedAt = new Date(household.deletedAt).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const ownerName = household.owner
    ? `${household.owner.firstName} ${household.owner.lastName}`.trim()
    : "—";
  const ownerEmail = household.owner?.email ?? "—";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{household.name}</p>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
            {household.baseCurrency}
          </Badge>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          Owner: {ownerName} · {ownerEmail}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Borrado el {deletedAt} · ID <code className="font-mono">{household.id.slice(0, 8)}</code>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <RestoreButton household={household} />
        <PurgeButton household={household} />
      </div>
    </div>
  );
}

function RestoreButton({ household }: { household: AdminDeletedHousehold }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await restoreAdminHousehold(household.id);
      invalidate();
      toast.success("Hogar restaurado");
      setOpen(false);
    } catch (e) {
      toastError(e, "No se pudo restaurar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        <RotateCcw className="mr-1 size-3" /> Restaurar
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Restaurar el hogar?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          El hogar{" "}
          <span className="font-semibold text-foreground">{household.name}</span> vuelve a estar
          visible para sus miembros inmediatamente. Toda la data (gastos, objetivos, etc.) queda
          intacta.
        </p>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button type="button" onClick={handle} disabled={busy}>
            {busy && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Restaurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PurgeButton({ household }: { household: AdminDeletedHousehold }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = typed.trim() === household.name;

  async function handle() {
    if (!matches) return;
    setBusy(true);
    try {
      await purgeAdminHousehold(household.id);
      invalidate();
      toast.success("Hogar purgado definitivamente");
      setOpen(false);
    } catch (e) {
      toastError(e, "No se pudo purgar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTyped("");
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="xs"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="mr-1 size-3" /> Purgar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Purgar hogar (irreversible)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            Se elimina físicamente la fila de <span className="font-semibold text-foreground">households</span>{" "}
            con CASCADE sobre members, categories, expenses, installments, shares, incomes,
            recurring, goals, settlements, split rules e invites. <span className="font-semibold text-destructive">Esta acción es irreversible.</span>
          </p>
          <div>
            <Label htmlFor={`purge-${household.id}`}>
              Escribí el nombre del hogar para confirmar:{" "}
              <span className="font-bold text-destructive">{household.name}</span>
            </Label>
            <Input
              id={`purge-${household.id}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={household.name}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handle}
            disabled={busy || !matches}
          >
            {busy && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Purgar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
