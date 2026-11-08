"use client";

import { useRouter } from "next/navigation";
import { logout as apiLogout } from "@/lib/api/auth";
import { unsubscribePush } from "@/lib/push";
import { clearLocalSession } from "@/lib/session";
import { useAuthStore } from "@/stores/auth";

/** Signs out on this device: push off, server session closed, local data wiped. */
export function useLogout() {
  const router = useRouter();
  return async function logout() {
    const token = useAuthStore.getState().accessToken;
    if (token) await unsubscribePush(token).catch(() => {});
    try {
      await apiLogout();
    } finally {
      await clearLocalSession();
      router.replace("/login");
    }
  };
}
