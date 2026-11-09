"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MenuItem } from "@/components/ui/menu-list";
import { deleteMe } from "@/lib/api/mutations";
import { useAuthStore } from "@/stores/auth";
import { clearLocalSession } from "@/lib/session";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";
import { unsubscribePush } from "@/lib/push";

const CONFIRMATION_WORD = "ELIMINAR";

/** "Eliminar mi cuenta" row in Seguridad; typing ELIMINAR confirms it. */
export function DeleteAccountItem() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);

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
      await clearLocalSession();
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
    <>
      <MenuItem icon={Trash2} label="Eliminar mi cuenta" tone="destructive" onClick={() => setOpen(true)} />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              No se puede deshacer. Lo que cargaste en un hogar queda para los demás, pero perdés el acceso. Si sos dueño de un
              hogar, pasale la propiedad a otro miembro o eliminalo antes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirm">
              Escribí <span className="font-bold text-negative">{CONFIRMATION_WORD}</span> para confirmar
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
            <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
              {err}
            </p>
          )}
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleDelete}
            disabled={busy || typed !== CONFIRMATION_WORD}
          >
            {busy ? "Eliminando…" : "Eliminar cuenta"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
