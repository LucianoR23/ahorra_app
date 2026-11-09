"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MenuItem } from "@/components/ui/menu-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordStrengthMeter,
  isPasswordStrongEnough,
} from "@/components/ui/password-strength-meter";
import { changePassword } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";

/** "Cambiar contraseña" row in Seguridad; the form opens in the sheet. */
export function ChangePasswordItem() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuItem icon={Lock} label="Cambiar contraseña" onClick={() => setOpen(true)} />
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cambiar contraseña</DialogTitle>
              <DialogDescription>Usá una contraseña única, que no uses en otro lado.</DialogDescription>
            </DialogHeader>
            <ChangePasswordForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const passwordOk = isPasswordStrongEnough(next);
  const passwordsMatch = confirm.length === 0 || next === confirm;
  const sameAsCurrent = next.length > 0 && next === current;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!token) return;
    if (!current) {
      setErrors({ current: "Requerido" });
      return;
    }
    if (!passwordOk) {
      setErrors({ next: "La contraseña no cumple las reglas" });
      return;
    }
    if (!passwordsMatch) {
      setErrors({ confirm: "Las contraseñas no coinciden" });
      return;
    }
    if (sameAsCurrent) {
      setErrors({ next: "La nueva contraseña debe ser distinta a la actual" });
      return;
    }
    setBusy(true);
    try {
      await changePassword(token, current, next);
      toast.success("Contraseña actualizada");
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "rate_limited") {
          toastError(err);
        } else if (err.code === "unauthorized") {
          setErrors({ current: "Contraseña actual incorrecta" });
        } else if (err.field) {
          setErrors({ [err.field]: err.message });
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: "Error inesperado" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={busy}
              aria-invalid={!!errors.current}
            />
            {errors.current && (
              <p className="text-caption text-negative">{errors.current}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={busy}
              aria-invalid={!!errors.next}
            />
            <PasswordStrengthMeter password={next} className="pt-2" />
            {errors.next && <p className="text-caption text-negative">{errors.next}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
              aria-invalid={!!errors.confirm || !passwordsMatch}
            />
            {!passwordsMatch && (
              <p className="text-caption text-negative">Las contraseñas no coinciden</p>
            )}
          </div>

          {errors.form && (
            <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
              {errors.form}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || !current || !passwordOk || !passwordsMatch || sameAsCurrent}
          >
            {busy ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </form>
  );
}
