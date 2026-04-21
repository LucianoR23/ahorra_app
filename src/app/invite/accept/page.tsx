"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Home, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { acceptInvite, getInvitePreview, type InvitePreview } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth";
import { toastError } from "@/lib/toast";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center px-4 py-10">
      <Link href="/login" aria-label="Ahorro — Inicio" className="mb-6 flex items-center">
        <BrandLogo variant="wordmark" size={40} priority />
      </Link>
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <Card className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando invitación…
              </div>
            </Card>
          }
        >
          <InviteAcceptInner />
        </Suspense>
      </div>
    </div>
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

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando invitación…
        </div>
      </Card>
    );
  }

  if (error || !preview) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Invitación no válida</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "No pudimos encontrar esta invitación."}
          </p>
        </div>
        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Ir a iniciar sesión
        </Link>
      </Card>
    );
  }

  if (preview.status !== "pending") {
    const msg =
      preview.status === "accepted"
        ? "Esta invitación ya fue aceptada."
        : preview.status === "revoked"
          ? "Esta invitación fue cancelada por el dueño del hogar."
          : "Esta invitación expiró. Pedile al dueño del hogar que te envíe una nueva.";
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Invitación no disponible</h1>
          <p className="text-sm text-muted-foreground">{msg}</p>
        </div>
        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver
        </Link>
      </Card>
    );
  }

  if (accepted) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">¡Bienvenido a {preview.householdName}!</h1>
          <p className="text-sm text-muted-foreground">Te estamos redirigiendo a tu hogar…</p>
        </div>
      </Card>
    );
  }

  const isLoggedIn = hydrated && !!user;
  const emailMismatch = isLoggedIn && user.email.toLowerCase() !== preview.email.toLowerCase();

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-2 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Home className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">Te invitaron a {preview.householdName}</h1>
        <p className="text-sm text-muted-foreground">
          Invitación para <span className="font-medium text-foreground">{preview.email}</span>
        </p>
      </div>

      {!hydrated ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : isLoggedIn ? (
        emailMismatch ? (
          <div className="space-y-3">
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Estás logueado como <span className="font-medium">{user.email}</span>, pero la
              invitación es para otro email. Cerrá sesión e ingresá con la cuenta correcta.
            </div>
            <Link href="/login" className="block">
              <Button variant="outline" size="lg" className="w-full">
                Iniciar sesión con otra cuenta
              </Button>
            </Link>
          </div>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Aceptar invitación
          </Button>
        )
      ) : (
        <div className="space-y-3">
          <Link
            href={`/register?inviteToken=${encodeURIComponent(token ?? "")}&email=${encodeURIComponent(preview.email)}`}
            className="block"
          >
            <Button size="lg" className="w-full">
              Crear cuenta y unirme
            </Button>
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/accept?token=${token ?? ""}`)}`}
            className="block"
          >
            <Button variant="outline" size="lg" className="w-full">
              Ya tengo cuenta
            </Button>
          </Link>
          <p className="text-center text-[11px] text-muted-foreground">
            La cuenta tiene que usar el mismo email de la invitación.
          </p>
        </div>
      )}
    </Card>
  );
}
