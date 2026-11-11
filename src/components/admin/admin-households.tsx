"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { House, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuGroup, MenuItem, MenuRow } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDeletedHouseholds } from "@/lib/api/hooks";
import { purgeAdminHousehold, restoreAdminHousehold } from "@/lib/api/mutations";
import type { AdminDeletedHousehold } from "@/lib/api/schemas";
import { confirm } from "@/lib/confirm";
import { toast, toastError } from "@/lib/toast";

function invalidate() {
  swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && (k[0].startsWith("/admin/") || k[0].startsWith("/households")),
    undefined,
    { revalidate: true },
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

/** Hogares their owners deleted (plan 1.11): restore or purge. */
export function AdminHouseholds() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Hogares borrados" className="mb-0" />
      <DeletedHouseholdsGroup />
    </div>
  );
}

function DeletedHouseholdsGroup() {
  const { data, isLoading, error } = useAdminDeletedHouseholds();
  const [selected, setSelected] = useState<AdminDeletedHousehold | null>(null);
  // Go sends an empty slice as null (the SWR fetcher does not apply zod defaults).
  const list = data ?? [];

  return (
    <MenuGroup
      footer="Los borraron sus dueños. Podés devolverlos o eliminarlos con todos sus datos."
    >
      {isLoading ? (
        <MenuRow>
          <Skeleton className="h-10 w-full" />
        </MenuRow>
      ) : error ? (
        <MenuRow>
          <Alert variant="error" className="w-full">
            No se pudo cargar la lista.
          </Alert>
        </MenuRow>
      ) : list.length === 0 ? (
        <MenuRow>
          <span className="text-ink-muted">No hay hogares borrados.</span>
        </MenuRow>
      ) : (
        list.map((h) => (
          <MenuItem
            key={h.id}
            icon={House}
            label={h.name}
            detail={`Borrado el ${fmtDate(h.deletedAt)}`}
            onClick={() => setSelected(h)}
          />
        ))
      )}
      {selected && <DeletedHouseholdSheet household={selected} onClose={() => setSelected(null)} />}
    </MenuGroup>
  );
}

function DeletedHouseholdSheet({ household, onClose }: { household: AdminDeletedHousehold; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState<"restore" | "purge" | null>(null);
  const matches = typed.trim() === household.name;
  const owner = household.owner;

  async function restore() {
    const ok = await confirm({
      title: "¿Devolver el hogar?",
      description: `${household.name} vuelve a aparecer para sus miembros, con todos sus datos.`,
      confirmLabel: "Restaurar",
    });
    if (!ok) return;
    setBusy("restore");
    try {
      await restoreAdminHousehold(household.id);
      invalidate();
      toast.success("Hogar restaurado");
      onClose();
    } catch (e) {
      toastError(e, "No se pudo restaurar");
      setBusy(null);
    }
  }

  async function purge() {
    if (!matches) return;
    setBusy("purge");
    try {
      await purgeAdminHousehold(household.id);
      invalidate();
      toast.success("Hogar eliminado para siempre");
      onClose();
    } catch (e) {
      toastError(e, "No se pudo eliminar");
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{household.name}</DialogTitle>
          <DialogDescription>Borrado el {fmtDate(household.deletedAt)}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
          <dt className="text-ink-muted">Dueño</dt>
          <dd className="min-w-0 text-right [overflow-wrap:anywhere]">
            {owner ? `${owner.firstName} ${owner.lastName}`.trim() : "Sin dueño"}
            {owner && <span className="block text-caption text-ink-muted">{owner.email}</span>}
          </dd>
          <dt className="text-ink-muted">Moneda</dt>
          <dd className="text-right">{household.baseCurrency}</dd>
          <dt className="text-ink-muted">ID</dt>
          <dd className="text-right font-mono text-caption">{household.id.slice(0, 8)}</dd>
        </dl>
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={restore} disabled={busy !== null}>
          {busy === "restore" && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Restaurar
        </Button>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-caption text-ink-muted">
            Eliminar para siempre borra el hogar con sus gastos, cuotas, ingresos, objetivos, pagos e invitaciones. No
            se puede deshacer.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`purge-${household.id}`}>
              Escribí <span className="font-semibold">{household.name}</span> para confirmar
            </Label>
            <Input
              id={`purge-${household.id}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy !== null}
            />
          </div>
          <Button type="button" variant="destructive" size="lg" className="w-full" onClick={purge} disabled={busy !== null || !matches}>
            {busy === "purge" && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Eliminar para siempre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
