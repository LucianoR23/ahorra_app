"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordStrengthMeter,
  isPasswordStrongEnough,
} from "@/components/ui/password-strength-meter";
import { register } from "@/lib/api/auth";
import { registerInputSchema } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth";
import { toastError, toast } from "@/lib/toast";
import { GoogleSignInButton } from "@/components/auth/google-button";
import {
  AuthDivider,
  AuthFootnote,
  AuthHeading,
  AuthPanel,
  FieldError,
  authLink,
} from "@/components/auth/auth-shell";

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") ?? undefined;
  const invitedEmail = searchParams.get("email") ?? undefined;
  const setSession = useAuthStore((s) => s.setSession);

  const [form, setForm] = useState({
    email: invitedEmail ?? "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: "Las contraseñas no coinciden" });
      return;
    }

    const parsed = registerInputSchema.safeParse({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      ...(inviteToken ? { inviteToken } : {}),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "form");
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      const res = await register(parsed.data);
      setSession(res);
      toast.success(
        inviteToken ? "¡Cuenta creada y uniste al hogar!" : "¡Cuenta creada!",
      );
      if (inviteToken) {
        router.replace("/");
      } else {
        sessionStorage.setItem("pending_verify_email", parsed.data.email);
        router.replace("/verify-email/pending");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "rate_limited") {
          toastError(err);
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

  const passwordOk = isPasswordStrongEnough(form.password);
  const passwordsMatch =
    form.confirmPassword.length === 0 || form.password === form.confirmPassword;

  return (
    <AuthPanel>
      <AuthHeading
        title="Crear cuenta"
        description={
          inviteToken
            ? "Cuando termines, quedás adentro del hogar al que te invitaron."
            : "Empezá a ordenar tu plata hoy."
        }
      />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              aria-invalid={!!errors.firstName}
              disabled={submitting}
            />
            <FieldError>{errors.firstName}</FieldError>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              aria-invalid={!!errors.lastName}
              disabled={submitting}
            />
            <FieldError>{errors.lastName}</FieldError>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={invitedEmail ? "email-hint" : undefined}
            disabled={submitting}
            readOnly={!!invitedEmail}
            className={invitedEmail ? "bg-surface-2 text-ink-muted" : undefined}
          />
          {invitedEmail && (
            <p id="email-hint" className="text-caption text-ink-muted">
              Es el email de la invitación, no se puede cambiar.
            </p>
          )}
          <FieldError>{errors.email}</FieldError>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            aria-invalid={!!errors.password}
            disabled={submitting}
          />
          <PasswordStrengthMeter password={form.password} className="pt-1" />
          <FieldError>{errors.password}</FieldError>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            aria-invalid={!!errors.confirmPassword || !passwordsMatch}
            disabled={submitting}
          />
          <FieldError>{!passwordsMatch ? "Las contraseñas no coinciden" : errors.confirmPassword}</FieldError>
        </div>

        {errors.form && <Alert variant="error">{errors.form}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting || !passwordOk || !passwordsMatch}>
          {submitting ? "Creando…" : "Crear cuenta"}
        </Button>
      </form>

      {/* Google sign-up cannot carry the invite token: an invited user signs up
          with email so the invite is accepted in the same request. */}
      {!inviteToken && (
        <>
          <AuthDivider />
          <GoogleSignInButton />
        </>
      )}

      <AuthFootnote>
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className={authLink}>
          Iniciar sesión
        </Link>
      </AuthFootnote>
    </AuthPanel>
  );
}

export default function RegisterPage() {
  // useSearchParams requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}
