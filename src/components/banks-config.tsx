"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Plus, Pencil, Loader2, Power, PowerOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBanks } from "@/lib/api/hooks";
import { createBank, patchBank, activateBank, deactivateBank } from "@/lib/api/mutations";
import type { Bank } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";

function invalidateBanks() {
  swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/banks"),
    undefined,
    { revalidate: true },
  );
}

export function BanksConfig() {
  const { data: banks, isLoading } = useBanks();
  const [editing, setEditing] = useState<Bank | null>(null);

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Bancos</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Instituciones financieras asociadas a tus medios de pago.
            </p>
          </div>
          <BankFormDialog mode="create" onDone={invalidateBanks} />
        </div>

        {isLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : !banks?.length ? (
          <p className="mt-3 text-xs text-muted-foreground">No hay bancos cargados.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {banks.map((bank) => (
              <div key={bank.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold">{bank.name}</span>
                  {!bank.isActive && (
                    <Badge variant="outline" className="ml-2 h-4 px-1.5 text-[9px]">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(bank)}>
                  <Pencil className="size-3.5" />
                </Button>
                <ToggleBankButton bank={bank} />
              </div>
            ))}
          </div>
        )}

        {editing && (
          <BankFormDialog
            mode="edit"
            bank={editing}
            open
            onOpenChange={(v) => !v && setEditing(null)}
            onDone={() => { invalidateBanks(); setEditing(null); }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ToggleBankButton({ bank }: { bank: Bank }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    setBusy(true);
    try {
      if (bank.isActive) {
        await deactivateBank(bank.id);
      } else {
        await activateBank(bank.id);
      }
      invalidateBanks();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="icon-sm" variant="ghost" onClick={handle} disabled={busy}>
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : bank.isActive ? (
        <PowerOff className="size-3.5" />
      ) : (
        <Power className="size-3.5" />
      )}
    </Button>
  );
}

function BankFormDialog({
  mode,
  bank,
  open: controlledOpen,
  onOpenChange,
  onDone,
}: {
  mode: "create" | "edit";
  bank?: Bank;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onDone: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState(bank?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    setSaving(true);
    try {
      if (mode === "create") {
        await createBank(name.trim());
      } else if (bank) {
        await patchBank(bank.id, name.trim());
      }
      onDone();
      setOpen(false);
      if (mode === "create") setName("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErr(null); }}>
      {mode === "create" && (
        <DialogTrigger render={<Button size="sm" onClick={() => setName("")} />}>
          <Plus className="mr-1 size-3.5" />
          Agregar
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo banco" : "Editar banco"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="bank-name">Nombre</Label>
            <Input
              id="bank-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Galicia"
              autoFocus
            />
          </div>
          {err && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
