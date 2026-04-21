"use client";

import { useState } from "react";
import { Loader2, MailWarning, X } from "lucide-react";
import { resendVerificationEmail } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth";
import { toast, toastError } from "@/lib/toast";

const DISMISS_KEY = "ahorra.emailVerifyBannerDismissedAt";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  });

  if (!user || user.emailVerifiedAt || !token || dismissed) return null;

  async function handleResend() {
    if (!token) return;
    setBusy(true);
    try {
      await resendVerificationEmail(token);
      toast.success("Te reenviamos el email de verificación");
    } catch (err) {
      if (err instanceof ApiError && err.code === "rate_limited") {
        toastError(err, "Esperá un ratito antes de pedir otro email.");
      } else {
        toastError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
      <MailWarning className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Verificá tu email</p>
        <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
          Te mandamos un link a <span className="font-medium">{user.email}</span>. Si no te llegó,
          podés reenviarlo.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={busy}
          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-500/30 disabled:opacity-60 dark:text-amber-200"
        >
          {busy && <Loader2 className="size-3 animate-spin" />}
          Reenviar email
        </button>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Ocultar"
        className="grid size-6 shrink-0 place-items-center rounded-md text-amber-700/70 transition-colors hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300/70 dark:hover:text-amber-200"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
