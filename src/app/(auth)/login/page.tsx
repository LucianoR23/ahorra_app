"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  AuthDivider,
  AuthFootnote,
  AuthHeading,
  AuthPanel,
  FieldError,
  authLink,
} from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { login } from "@/lib/api/auth";
import { loginInputSchema } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { useIsClient } from "@/lib/hooks";
import { safeNext } from "@/lib/safe-next";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { toastError } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth";
import { brand } from "@/config/brand";

const REMEMBER_KEY = STORAGE_KEYS.rememberedEmail;

function readRemembered(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeRemembered(email: string | null) {
  try {
    if (email) localStorage.setItem(REMEMBER_KEY, email);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Storage blocked (private mode): remembering is a convenience.
  }
}

export default function LoginPage() {
  // The remembered email lives in localStorage, which the server cannot read.
  // The first client render must match the server one (empty), so the form
  // mounts again once hydrated, now with the stored email.
  const isClient = useIsClient();
  const remembered = isClient ? readRemembered() : "";
  return <LoginForm key={isClient ? "client" : "server"} remembered={remembered} />;
}

function LoginForm({ remembered }: { remembered: string }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(remembered !== "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = loginInputSchema.safeParse({ email, password });
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
      const res = await login(parsed.data);
      writeRemembered(rememberMe ? email.trim() : null);
      setSession(res);
      router.replace(safeNext(window.location.search));
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

  return (
    <AuthPanel>
      <AuthHeading title="Iniciar sesión" description={`Bienvenido de vuelta a ${brand.name}.`} />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={submitting}
          />
          <FieldError id="email-error">{errors.email}</FieldError>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/forgot-password" className="text-caption font-semibold text-brand-ink underline-offset-4 hover:underline">
              ¿Te la olvidaste?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={submitting}
          />
          <FieldError id="password-error">{errors.password}</FieldError>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink">
          <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} />
          Recordar mi email
        </label>

        {errors.form && <Alert variant="error">{errors.form}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <AuthDivider />
      <GoogleSignInButton />

      <AuthFootnote>
        ¿No tenés cuenta?{" "}
        <Link href="/register" className={authLink}>
          Crear cuenta
        </Link>
      </AuthFootnote>
    </AuthPanel>
  );
}
