"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordStrengthMeter,
  isPasswordStrongEnough,
} from "@/components/ui/password-strength-meter";
import { passwordSchema } from "@/lib/api/schemas";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { toastError, toast } from "@/lib/toast";
import { KeyRound, AlertTriangle } from "lucide-react";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este enlace de restablecimiento no tiene token. Pedí uno nuevo desde la página de
            recuperación.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="mt-6 block text-center text-sm text-foreground underline-offset-4 hover:underline"
        >
          Solicitar otro link
        </Link>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Las contraseñas no coinciden" });
      return;
    }

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setErrors({
        password: parsed.error.issues[0]?.message ?? "Contraseña inválida",
      });
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token!, password);
      toast.success("Contraseña actualizada", {
        description: "Ya podés iniciar sesión con tu nueva contraseña.",
      });
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "rate_limited") {
          toastError(err);
        } else if (err.code === "unauthorized") {
          setErrors({
            form: "Token inválido o expirado. Pedí un link nuevo.",
          });
        } else if (err.field) {
          setErrors({ [err.field]: err.message });
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: "Error inesperado" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const passwordOk = isPasswordStrongEnough(password);
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-1">
        <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Elegí una contraseña segura que no uses en otros sitios.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            disabled={submitting}
            autoFocus
          />
          <PasswordStrengthMeter password={password} className="pt-1" />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!errors.confirmPassword || !passwordsMatch}
            disabled={submitting}
          />
          {!passwordsMatch && (
            <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
          )}
        </div>

        {errors.form && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errors.form}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || !passwordOk || !passwordsMatch}
        >
          {submitting ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
