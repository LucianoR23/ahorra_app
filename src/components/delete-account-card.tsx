"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteMe } from "@/lib/api/mutations";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";
import { unsubscribePush } from "@/lib/push";

const CONFIRMATION_WORD = "ELIMINAR";

export function DeleteAccountCard() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clear);
  const setHouseholdId = useHouseholdStore((s) => s.setCurrentId);

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleDelete() {
    if (typed !== CONFIRMATION_WORD) return;
    setBusy(true);
    setErr(null);
    try {
      if (token) await unsubscribePush(token).catch(() => {});
      await deleteMe();
      toast.success("Cuenta eliminada");
      clearAuth();
      setHouseholdId(null);
      router.replace("/login");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "conflict") {
          setErr(e.message);
        } else {
          toastError(e);
        }
      } else {
        toastError(e);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl border border-destructive/30 bg-destructive/2 shadow-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-destructive">Eliminar cuenta</h2>
            <p className="text-[11px] text-muted-foreground">
              Acción permanente. Tu historial en los hogares se preserva, pero tu acceso se
              revoca.
            </p>
          </div>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setTyped("");
              setErr(null);
            }
          }}
        >
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              />
            }
          >
            <Trash2 className="mr-1 size-3.5" />
            Eliminar mi cuenta
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">¿Eliminar tu cuenta?</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">
                Esta acción no se puede deshacer. Si sos owner de algún hogar necesitás transferir
                la propiedad o eliminar esos hogares antes.
              </p>
              <div>
                <Label htmlFor="delete-confirm">
                  Escribí <span className="font-bold text-destructive">{CONFIRMATION_WORD}</span>{" "}
                  para confirmar
                </Label>
                <Input
                  id="delete-confirm"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value.toUpperCase())}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              {err && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {err}
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>
                Cancelar
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={busy || typed !== CONFIRMATION_WORD}
              >
                {busy && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                Eliminar cuenta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
