import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { ReloadButton } from "./reload-button";

export const metadata: Metadata = { robots: { index: false } };

// Served by the service worker when a page can't load offline (plan 0.13).
// Precached at build time, so it must stay static: no data, no auth.
export default function OfflinePage() {
  return (
    <StatusScreen
      icon={<WifiOff className="size-6" />}
      title="Sin conexión"
      description="No pudimos cargar esta pantalla. Revisá tu conexión a internet y probá de nuevo."
    >
      <ReloadButton />
    </StatusScreen>
  );
}
