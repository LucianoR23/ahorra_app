"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { verifyEmail } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center px-4 py-10">
      <Link href="/" aria-label="Ahorro — Inicio" className="mb-6 flex items-center">
        <BrandLogo variant="wordmark" size={40} priority />
      </Link>
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Verificando…
              </div>
            </Card>
          }
        >
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);

  const [state, setState] = useState<"loading" | "success" | "error" | "no-token">(
    token ? "loading" : "no-token",
  );
  const [message, setMessage] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;
    (async () => {
      try {
        await verifyEmail(token);
        if (user && !user.emailVerifiedAt) {
          setUser({ ...user, emailVerifiedAt: new Date().toISOString() });
        }
        sessionStorage.removeItem("pending_verify_email");
        setState("success");
      } catch (err) {
        setState("error");
        if (err instanceof ApiError) {
          if (err.code === "unauthorized" || err.code === "not_found") {
            setMessage("El link expiró o no es válido. Solicitá uno nuevo desde tu cuenta.");
          } else if (err.code === "rate_limited") {
            setMessage("Demasiados intentos. Probá de nuevo en unos minutos.");
          } else {
            setMessage(err.message);
          }
        } else {
          setMessage("No pudimos verificar tu email.");
        }
      }
    })();
  }, [token, setUser, user]);

  if (state === "no-token") {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link no tiene token de verificación.
          </p>
        </div>
        <Link
          href="/"
          className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver al inicio
        </Link>
      </Card>
    );
  }

  if (state === "loading") {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Verificando tu email…</h1>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (state === "success") {
    // If we haven't hydrated yet, AuthBootstrap may still be recovering the
    // session from the refresh cookie. Show a spinner so the CTA doesn't flicker.
    const waitingForSession = !hydrated;
    const needsLogin = hydrated && !user;
    const cta = waitingForSession
      ? { href: "#", label: "Cargando…" }
      : needsLogin
      ? { href: "/login", label: "Iniciar sesión" }
      : currentHouseholdId
      ? { href: "/", label: "Ir al inicio" }
      : { href: "/onboarding", label: "Continuar" };

    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">¡Email verificado!</h1>
          <p className="text-sm text-muted-foreground">
            {needsLogin
              ? "Iniciá sesión para terminar de configurar tu cuenta."
              : "Listo. Ya podés usar todas las funciones de tu cuenta."}
          </p>
        </div>
        <Link
          href={cta.href}
          className={`mt-6 block ${waitingForSession ? "pointer-events-none" : ""}`}
          aria-disabled={waitingForSession}
        >
          <Button size="lg" className="w-full" disabled={waitingForSession}>
            {waitingForSession ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {cta.label}
              </>
            ) : (
              cta.label
            )}
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">No pudimos verificar tu email</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Link
        href="/"
        className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Volver al inicio
      </Link>
    </Card>
  );
}
