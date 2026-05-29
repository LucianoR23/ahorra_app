/**
 * Metadata técnica del cliente para adjuntar a un ticket de soporte.
 * Browser-only: usa navigator/window. Llamar solo en Client Components.
 * Todos los campos son opcionales (ver integracion.md §6).
 */
export type ClientMetadata = {
  app_version?: string;
  user_agent?: string;
  url?: string;
  viewport?: string;
  locale?: string;
  client_ts?: string;
};

export function captureClientMetadata(): ClientMetadata {
  if (typeof window === "undefined") return {};
  return {
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
    user_agent: navigator.userAgent,
    url: window.location.href,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    locale: navigator.language,
    client_ts: new Date().toISOString(),
  };
}
