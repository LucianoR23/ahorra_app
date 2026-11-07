"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logoutAll } from "@/lib/api/mutations";
import { confirm } from "@/lib/confirm";
import { unsubscribePush } from "@/lib/push";
import { toast, toastError } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth";
import { clearLocalSession } from "@/lib/session";

/**
 * Ends every session of the account on the server (plan 0.5): any device or
 * copied token stops working at its next refresh, and this one signs out now.
 */
export function SignOutEverywhereCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const ok = await confirm({
      title: "¿Cerrar sesión en todos los dispositivos?",
      description: "Vas a tener que volver a iniciar sesión en cada uno, también en este.",
      confirmLabel: "Cerrar todas",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const token = useAuthStore.getState().accessToken;
      if (token) await unsubscribePush(token).catch(() => {});
      await logoutAll();
      toast.success("Cerraste sesión en todos los dispositivos");
      await clearLocalSession();
      router.replace("/login");
    } catch (e) {
      toastError(e);
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
            <LogOut className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Sesiones</h2>
            <p className="text-xs text-muted-foreground">
              Si perdiste un dispositivo o iniciaste sesión en uno que no es tuyo, cerrá todas las
              sesiones de tu cuenta.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleClick} disabled={busy}>
          {busy ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <LogOut className="mr-1 size-3.5" />}
          Cerrar sesión en todos los dispositivos
        </Button>
      </CardContent>
    </Card>
  );
}
