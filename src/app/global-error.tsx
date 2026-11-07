"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/status-screen";
import { reportError } from "@/lib/report-error";

// Replaces the root layout when it fails (plan 0.13), so it brings its own
// document and styles. Dark, like the app's default theme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="es" className="dark">
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <StatusScreen
          icon={<TriangleAlert className="size-6" />}
          title="Algo salió mal"
          description="Tuvimos un problema al abrir la app. Probá de nuevo en unos segundos."
        >
          <Button size="lg" className="w-full" onClick={() => retry()}>
            Reintentar
          </Button>
        </StatusScreen>
      </body>
    </html>
  );
}
