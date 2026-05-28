"use client";

import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { swrFetcher } from "@/lib/api/swr-fetcher";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { useInsightsRealtime } from "@/lib/insights-stream";
import { ConfirmDialogHost } from "@/lib/confirm";

// Google OAuth client ID. Si está vacío (dev sin configurar), el provider
// igual monta — el botón de Google va a fallar en el front al intentar
// inicializar, pero el resto del flujo (login/register clásico) sigue ok.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// InsightsRealtimeBridge: monta una conexión SSE única a nivel app. Vive
// dentro de Providers para que esté disponible en cualquier ruta autenticada
// — el hook es no-op si no hay token o householdId.
function InsightsRealtimeBridge() {
  useInsightsRealtime();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <SWRConfig
          value={{
            fetcher: swrFetcher,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
          }}
        >
          <AuthBootstrap />
          <InsightsRealtimeBridge />
          {children}
          <ConfirmDialogHost />
          <Toaster
            position="top-center"
            richColors
            closeButton
            theme="system"
            toastOptions={{ className: "font-sans" }}
          />
        </SWRConfig>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
