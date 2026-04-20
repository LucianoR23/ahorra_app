"use client";

import { create } from "zustand";
import type { AuthResponse, User } from "@/lib/api/schemas";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  accessExpiresAt: string | null;
  hydrated: boolean;
  setSession: (s: AuthResponse) => void;
  setToken: (token: string, expiresAt: string) => void;
  setUser: (u: User | null) => void;
  setHydrated: (v: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  accessExpiresAt: null,
  hydrated: false,
  setSession: (s) => set({ user: s.user, accessToken: s.accessToken, accessExpiresAt: s.accessExpiresAt }),
  setToken: (token, expiresAt) => set({ accessToken: token, accessExpiresAt: expiresAt }),
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  clear: () => set({ user: null, accessToken: null, accessExpiresAt: null }),
}));

/** Snapshot for non-React contexts (Server Action callers). */
export function getAuthSnapshot() {
  const s = useAuthStore.getState();
  return { token: s.accessToken, user: s.user };
}
