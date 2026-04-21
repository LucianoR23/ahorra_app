"use client";

import { useState } from "react";
import { Loader2, Lock, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

export function ChangePasswordCard() {
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
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Contraseña actualizada");
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
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Lock className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Cambiar contraseña</h2>
            <p className="text-[11px] text-muted-foreground">
              Usá una contraseña única y fuerte.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
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
              <p className="mt-1 text-xs text-destructive">{errors.current}</p>
            )}
          </div>

          <div>
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
            {errors.next && <p className="mt-1 text-xs text-destructive">{errors.next}</p>}
          </div>

          <div>
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
              <p className="mt-1 text-xs text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>

          {errors.form && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errors.form}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={busy || !current || !passwordOk || !passwordsMatch || sameAsCurrent}
            >
              {busy ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Save className="mr-1 size-3.5" />
              )}
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
