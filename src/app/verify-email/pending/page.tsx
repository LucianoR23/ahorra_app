"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { getMe, resendVerificationEmail } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { toastError } from "@/lib/toast";
import { toast } from "@/lib/toast";

export default function Page() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);

  const [email] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem("pending_verify_email"),
  );
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const redirectAfterVerified = useCallback(() => {
    sessionStorage.removeItem("pending_verify_email");
    router.replace(currentHouseholdId ? "/" : "/onboarding");
  }, [router, currentHouseholdId]);

  const checkVerified = useCallback(
    async (opts?: { showToast?: boolean }) => {
      if (!accessToken) return false;
      try {
        const me = await getMe(accessToken);
        setUser(me);
        if (me.emailVerifiedAt) {
          redirectAfterVerified();
          return true;
        }
        if (opts?.showToast) {
          toast.info("Todavía no detectamos tu verificación. Probá de nuevo en unos segundos.");
        }
        return false;
      } catch (err) {
        if (opts?.showToast) toastError(err);
        return false;
      }
    },
    [accessToken, setUser, redirectAfterVerified],
  );

  // If the user is already verified (e.g. came back to this page by mistake),
  // bounce them to the right place.
  useEffect(() => {
    if (user?.emailVerifiedAt) redirectAfterVerified();
  }, [user?.emailVerifiedAt, redirectAfterVerified]);

  // When the user comes back to this tab (likely after verifying in another tab),
  // silently re-check status so we can auto-advance.
  useEffect(() => {
    if (!accessToken) return;
    function onVisible() {
      if (document.visibilityState === "visible") {
        void checkVerified();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [accessToken, checkVerified]);

  async function handleCheckVerified() {
    if (!accessToken || checking) return;
    setChecking(true);
    try {
      await checkVerified({ showToast: true });
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    if (!accessToken || resending || resent) return;
    setResending(true);
    try {
      await resendVerificationEmail(accessToken);
      setResent(true);
      toast.success("Email reenviado");
      cooldownRef.current = setTimeout(() => setResent(false), 60_000);
    } catch (err) {
      toastError(err);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center px-4 py-10">
      <Link href="/" aria-label="Ahorra — Inicio" className="mb-6 flex items-center">
        <BrandLogo variant="wordmark" size={40} priority />
      </Link>
      <div className="w-full max-w-sm">
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-6" />
            </div>
            <h1 className="text-xl font-semibold">Verificá tu email</h1>
            <p className="text-sm text-muted-foreground">
              Te enviamos un email a{" "}
              {email ? (
                <span className="font-medium text-foreground">{email}</span>
              ) : (
                "tu casilla de correo"
              )}
              . Hacé clic en el link para continuar.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              onClick={handleCheckVerified}
              disabled={checking || !accessToken}
            >
              {checking ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Chequeando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Ya verifiqué mi email
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending || resent || !accessToken}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Reenviando…
                </>
              ) : resent ? (
                "Email enviado"
              ) : (
                "Reenviar email"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
