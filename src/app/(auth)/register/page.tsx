"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
    <Card className="p-6 md:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold">Crear cuenta</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {inviteToken
            ? "Al completar el registro te vas a unir al hogar al que te invitaron."
            : "Empezá a controlar tus gastos hoy."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              aria-invalid={!!errors.firstName}
              disabled={submitting}
              className="md:h-11 md:text-base"
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              aria-invalid={!!errors.lastName}
              disabled={submitting}
              className="md:h-11 md:text-base"
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={!!errors.email}
            disabled={submitting}
            readOnly={!!invitedEmail}
            className={invitedEmail ? "md:h-11 md:text-base bg-muted text-muted-foreground" : "md:h-11 md:text-base"}
          />
          {invitedEmail && (
            <p className="text-[11px] text-muted-foreground">
              Este email viene de la invitación y no se puede cambiar.
            </p>
          )}
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            aria-invalid={!!errors.password}
            disabled={submitting}
            className="md:h-11 md:text-base"
          />
          <PasswordStrengthMeter password={form.password} className="pt-1" />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            aria-invalid={!!errors.confirmPassword || !passwordsMatch}
            disabled={submitting}
            className="md:h-11 md:text-base"
          />
          {!passwordsMatch && (
            <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
          )}
          {errors.confirmPassword && passwordsMatch && (
            <p className="text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || !passwordOk || !passwordsMatch}
        >
          {submitting ? "Creando…" : "Crear cuenta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </Card>
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
