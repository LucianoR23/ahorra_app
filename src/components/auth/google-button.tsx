"use client";

import { useTheme } from "next-themes";
import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { loginWithGoogle } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { toastError } from "@/lib/toast";

// GoogleSignInButton: renderiza el botón oficial de Google Identity Services.
// El componente devuelve un ID token al onSuccess; lo mandamos al backend y
// recibimos AuthResponse + isNewUser. Si isNewUser, redirigimos directo a
// /onboarding sin esperar al AuthGate.
//
// theme="filled_black" en dark mode y "outline" en light para que se vea
// consistente con la UI. width="100%" hace que matchee el ancho del form.
export function GoogleSignInButton() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const { resolvedTheme } = useTheme();

  return (
    <GoogleLogin
      theme={resolvedTheme === "dark" ? "filled_black" : "outline"}
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
