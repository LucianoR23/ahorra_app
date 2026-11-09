"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, House, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthResult, AuthShell } from "@/components/auth/auth-shell";
import { acceptInvite, getInvitePreview, type InvitePreview } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth";
import { toastError } from "@/lib/toast";

function LoadingInvite() {
  return (
    <AuthResult icon={House} tone="neutral" title="Cargando la invitación…">
      <Loader2 aria-label="Cargando" className="mx-auto size-5 animate-spin text-ink-muted" />
    </AuthResult>
  );
}

export default function Page() {
  return (
    <AuthShell>
      <Suspense fallback={<LoadingInvite />}>
        <InviteAcceptInner />
      </Suspense>
    </AuthShell>
  );
}

function InviteAcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState<string | null>(() =>
    token ? null : "El link de invitación no es válido.",
  );
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getInvitePreview(token);
        if (!cancelled) setPreview(p);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "not_found") {
          setError("La invitación no existe o ya fue usada.");
        } else {
          setError(err instanceof ApiError ? err.message : "No se pudo cargar la invitación");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    try {
      await acceptInvite(token);
      setAccepted(true);
      setTimeout(() => router.replace("/"), 1500);
    } catch (err) {
      if (err instanceof ApiError && err.code === "forbidden") {
        toastError(err, "Tu email no coincide con la invitación. Iniciá sesión con la cuenta correcta.");
      } else if (err instanceof ApiError && err.code === "conflict") {
        toastError(err, "Esta invitación ya no es válida.");
      } else {
        toastError(err);
      }
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <LoadingInvite />;

  const backToLogin = (
    <Button variant="outline" size="lg" className="w-full" nativeButton={false} render={<Link href="/login" />}>
      Ir a iniciar sesión
    </Button>
  );

  if (error || !preview) {
    return (
      <AuthResult
        icon={CircleAlert}
        tone="negative"
        title="Esta invitación no sirve"
        description={error ?? "No encontramos esta invitación."}
      >
        {backToLogin}
      </AuthResult>
    );
  }

  if (preview.status !== "pending") {
    const msg =
      preview.status === "accepted"
        ? "Esta invitación ya se usó."
        : preview.status === "revoked"
          ? "Quien te invitó la canceló."
          : "Esta invitación venció. Pedile a quien te invitó que te mande otra.";
    return (
      <AuthResult icon={CircleAlert} tone="neutral" title="Invitación no disponible" description={msg}>
        {backToLogin}
      </AuthResult>
    );
  }

  if (accepted) {
    return (
      <AuthResult title={`Ya sos parte de ${preview.householdName}`} description="Te llevamos al hogar…" />
    );
  }

  const isLoggedIn = hydrated && !!user;
  const emailMismatch = isLoggedIn && user.email.toLowerCase() !== preview.email.toLowerCase();
  const nextHere = `/invite/accept?token=${encodeURIComponent(token ?? "")}`;

  return (
    <AuthResult
      icon={House}
      tone="neutral"
      title={`Te invitaron a ${preview.householdName}`}
      description={
        <>
          La invitación es para <span className="font-semibold text-ink">{preview.email}</span>. En el hogar llevan
          juntos los gastos compartidos y las cuentas entre ustedes.
        </>
      }
    >
      {!hydrated ? (
        <Loader2 aria-label="Cargando" className="mx-auto size-5 animate-spin text-ink-muted" />
      ) : isLoggedIn ? (
        emailMismatch ? (
          <>
            <Alert variant="error" className="text-left">
              Entraste como <span className="font-semibold">{user.email}</span> y la invitación es para otro email.
              Cerrá sesión y entrá con la cuenta correcta.
            </Alert>
            <Button variant="outline" size="lg" className="w-full" nativeButton={false} render={<Link href="/login" />}>
              Entrar con otra cuenta
            </Button>
          </>
        ) : (
          <Button type="button" size="lg" className="w-full" onClick={handleAccept} disabled={accepting}>
            {accepting && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Aceptar invitación
          </Button>
        )
      ) : (
        <>
          <Button
            size="lg"
            className="w-full"
            nativeButton={false}
            render={
              <Link
                href={`/register?inviteToken=${encodeURIComponent(token ?? "")}&email=${encodeURIComponent(preview.email)}`}
              />
            }
          >
            Crear cuenta y unirme
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            nativeButton={false}
            render={<Link href={`/login?next=${encodeURIComponent(nextHere)}`} />}
          >
            Ya tengo cuenta
          </Button>
          <p className="text-center text-caption text-ink-muted">
            La cuenta tiene que usar el mismo email de la invitación.
          </p>
        </>
      )}
    </AuthResult>
  );
}
