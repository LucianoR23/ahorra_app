"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MailCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { resendVerificationEmail } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth";
import { toastError } from "@/lib/toast";
import { toast } from "@/lib/toast";

export default function Page() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [email, setEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("pending_verify_email");
    if (stored) setEmail(stored);
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

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

          <Button
            size="lg"
            variant="outline"
            className="mt-6 w-full"
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
        </Card>
      </div>
    </div>
  );
}
