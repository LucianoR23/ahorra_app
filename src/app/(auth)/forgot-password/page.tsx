"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { forgotPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { toastError } from "@/lib/toast";
import { Mail, CheckCircle2 } from "lucide-react";

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
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Revisá tu correo</h1>
          <p className="text-sm text-muted-foreground">
            Si el email <span className="font-medium text-foreground">{email}</span> está
            registrado, te mandamos un link para restablecer tu contraseña. Puede tardar unos
            minutos — revisá también la carpeta de spam.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-1">
        <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Mail className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Ingresá el email de tu cuenta y te mandamos un link para cambiarla.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Enviando…" : "Enviar link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </Card>
  );
}
