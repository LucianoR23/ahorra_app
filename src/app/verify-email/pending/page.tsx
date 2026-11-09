"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthResult, AuthShell } from "@/components/auth/auth-shell";
import { getMe, resendVerificationEmail } from "@/lib/api/auth";
import { useIsClient } from "@/lib/hooks";
import { useAuthStore } from "@/stores/auth";
import { toast, toastError } from "@/lib/toast";

function readPendingEmail(): string | null {
  try {
    return sessionStorage.getItem("pending_verify_email");
  } catch {
    return null;
  }
}

export default function Page() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // sessionStorage only exists in the browser: read it after hydration so the
  // first client render matches the server one.
  const isClient = useIsClient();
  const email = isClient ? readPendingEmail() : null;
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
    // AuthGate on "/" waits for the households and sends to /onboarding if none.
    router.replace("/");
  }, [router]);

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
    <AuthShell home="/">
      <AuthResult
        icon={MailCheck}
        tone="neutral"
        title="Verificá tu email"
        description={
          <>
            Te mandamos un mail a{" "}
            {email ? <span className="font-semibold text-ink">{email}</span> : "tu casilla"}. Tocá el link que trae
            para seguir.
          </>
        }
      >
        <Button size="lg" className="w-full" onClick={handleCheckVerified} disabled={checking || !accessToken}>
          {checking && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {checking ? "Revisando…" : "Ya lo verifiqué"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={resending || resent || !accessToken}
        >
          {resending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {resending ? "Reenviando…" : resent ? "Mail enviado" : "Reenviar mail"}
        </Button>
      </AuthResult>
    </AuthShell>
  );
}
