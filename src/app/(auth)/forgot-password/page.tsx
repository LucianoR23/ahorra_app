"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFootnote, AuthHeading, AuthPanel, AuthResult, authLink } from "@/components/auth/auth-shell";
import { forgotPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { toastError } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Ingresá un email");
      return;
    }
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "rate_limited") {
        toastError(err);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error inesperado");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthResult
        icon={Mail}
        title="Te enviamos un mail"
        description={
          <>
            Si <span className="font-semibold text-ink">{email.trim()}</span> tiene una cuenta, te llega un link para
            cambiar la contraseña. Puede tardar unos minutos; mirá también en spam.
          </>
        }
      >
        <Button variant="outline" size="lg" className="w-full" nativeButton={false} render={<Link href="/login" />}>
          Volver a iniciar sesión
        </Button>
      </AuthResult>
    );
  }

  return (
    <AuthPanel>
      <AuthHeading
        title="Recuperar contraseña"
        description="Escribí el email de tu cuenta y te mandamos un link para cambiarla."
      />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            disabled={submitting}
            autoFocus
          />
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Enviando…" : "Enviar link"}
        </Button>
      </form>

      <AuthFootnote>
        <Link href="/login" className={authLink}>
          Volver a iniciar sesión
        </Link>
      </AuthFootnote>
    </AuthPanel>
  );
}
