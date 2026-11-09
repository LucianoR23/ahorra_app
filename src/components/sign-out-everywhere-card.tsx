"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { MenuItem } from "@/components/ui/menu-list";
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
export function SignOutEverywhereItem() {
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
    <MenuItem
      icon={busy ? Loader2 : LogOut}
      label="Cerrar sesión en todos los dispositivos"
      onClick={busy ? undefined : handleClick}
    />
  );
}
