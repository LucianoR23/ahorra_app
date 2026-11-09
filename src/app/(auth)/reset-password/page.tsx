"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter, isPasswordStrongEnough } from "@/components/ui/password-strength-meter";
import { AuthHeading, AuthPanel, AuthResult, FieldError } from "@/components/auth/auth-shell";
import { passwordSchema } from "@/lib/api/schemas";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { toastError, toast } from "@/lib/toast";

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
      <AuthResult
        icon={TriangleAlert}
        tone="negative"
        title="Este link no sirve"
        description="Le falta una parte. Pedí uno nuevo y abrilo desde el mail."
      >
        <Button size="lg" className="w-full" nativeButton={false} render={<Link href="/forgot-password" />}>
          Pedir otro link
        </Button>
      </AuthResult>
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
      setErrors({ password: parsed.error.issues[0]?.message ?? "Contraseña inválida" });
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token!, password);
      toast.success("Contraseña actualizada", {
        description: "Ya podés iniciar sesión con la nueva.",
      });
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "rate_limited") {
          toastError(err);
        } else if (err.code === "unauthorized") {
          setErrors({ form: "El link venció o ya se usó. Pedí uno nuevo." });
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
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  return (
    <AuthPanel>
      <AuthHeading title="Nueva contraseña" description="Elegí una que no uses en otros sitios." />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
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
          <FieldError>{errors.password}</FieldError>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!errors.confirmPassword || !passwordsMatch}
            disabled={submitting}
          />
          <FieldError>{!passwordsMatch ? "Las contraseñas no coinciden" : errors.confirmPassword}</FieldError>
        </div>

        {errors.form && (
          <Alert variant="error">
            {errors.form}{" "}
            <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
              Pedir otro link
            </Link>
          </Alert>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting || !passwordOk || !passwordsMatch}>
          {submitting ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </AuthPanel>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
