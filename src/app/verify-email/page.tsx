"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthResult, AuthShell } from "@/components/auth/auth-shell";
import { verifyEmail } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth";

function Verifying() {
  return (
    <AuthResult icon={MailCheck} tone="neutral" title="Verificando tu email…">
      <Loader2 aria-label="Cargando" className="mx-auto size-5 animate-spin text-ink-muted" />
    </AuthResult>
  );
}

export default function Page() {
  return (
    <AuthShell home="/">
      <Suspense fallback={<Verifying />}>
        <VerifyEmailInner />
      </Suspense>
    </AuthShell>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

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
      <AuthResult icon={CircleAlert} tone="negative" title="Este link no sirve" description="Le falta una parte. Abrilo de nuevo desde el mail.">
        <Button variant="outline" size="lg" className="w-full" nativeButton={false} render={<Link href="/" />}>
          Volver al inicio
        </Button>
      </AuthResult>
    );
  }

  if (state === "loading") return <Verifying />;

  if (state === "success") {
    // Before hydration AuthBootstrap may still be recovering the session from
    // the refresh cookie: hold the button so it does not flicker.
    const waitingForSession = !hydrated;
    const needsLogin = hydrated && !user;
    return (
      <AuthResult
        title="Email verificado"
        description={
          needsLogin
            ? "Iniciá sesión para terminar de armar tu cuenta."
            : "Listo. Ya podés usar todo."
        }
      >
        {waitingForSession ? (
          <Button size="lg" className="w-full" disabled>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Cargando…
          </Button>
        ) : (
          <Button size="lg" className="w-full" nativeButton={false} render={<Link href={needsLogin ? "/login" : "/"} />}>
            {needsLogin ? "Iniciar sesión" : "Ir al inicio"}
          </Button>
        )}
      </AuthResult>
    );
  }

  return (
    <AuthResult icon={CircleAlert} tone="negative" title="No pudimos verificar tu email" description={message}>
      <Button variant="outline" size="lg" className="w-full" nativeButton={false} render={<Link href="/" />}>
        Volver al inicio
      </Button>
    </AuthResult>
  );
}
