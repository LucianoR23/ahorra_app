"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { loginWithGoogle } from "@/lib/api/auth";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toastError } from "@/lib/toast";
import type { Household } from "@/lib/api/schemas";

// GoogleSignInButton: renderiza el botón oficial de Google Identity Services.
// El componente devuelve un ID token al onSuccess; lo mandamos al backend y
// recibimos AuthResponse + isNewUser. Si isNewUser, redirigimos directo a
// /onboarding sin esperar al AuthGate.
//
// Forzamos siempre theme="outline" (botón blanco): cuando el user ya está
// logueado en Google, GSI cambia al variant personalizado ("Sign in as X")
// que IGNORA el prop theme y siempre se renderiza blanco. Usamos blanco
// siempre para evitar el salto visual filled_black ↔ blanco.
export function GoogleSignInButton() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setHouseholdId = useHouseholdStore((s) => s.setCurrentId);

  return (
    <GoogleLogin
      theme="outline"
        size="large"
        shape="pill"
        text="continue_with"
        logo_alignment="left"
        // width en px; el componente clamp a 400 max y centra el contenido.
        width="320"
        onSuccess={async (cred) => {
        if (!cred.credential) {
          toastError(new Error("No se recibió token de Google"));
          return;
        }
        try {
          const res = await loginWithGoogle(cred.credential);
          setSession({
            user: res.user,
            accessToken: res.accessToken,
            accessExpiresAt: res.accessExpiresAt,
          });

          // Para usuarios existentes (isNewUser=false), pre-cargamos el
          // household antes de redirigir. Sin esto AuthGate ve user sin
          // household y empuja a /onboarding por un frame hasta que
          // AuthBootstrap termina de fetchear → flash visual.
          // Para usuarios nuevos no aplica: vamos directo a /onboarding.
          if (!res.isNewUser) {
            try {
              const households = await apiFetch<Household[]>({
                path: "/households",
                token: res.accessToken,
              });
              setHouseholdId(households.length > 0 ? households[0].id : null);
            } catch {
              // Si falla, AuthBootstrap reintenta y AuthGate decide igual.
            }
          }
          router.replace(res.isNewUser ? "/onboarding" : "/");
        } catch (err) {
          if (err instanceof ApiError) {
            toastError(err);
          } else {
            toastError(new Error("No se pudo iniciar sesión con Google"));
          }
        }
      }}
      onError={() => {
        toastError(new Error("Error al iniciar sesión con Google"));
      }}
    />
  );
}
