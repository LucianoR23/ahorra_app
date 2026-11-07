"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/status-screen";
import { reportError } from "@/lib/report-error";

// Error boundary for every route under the root layout (plan 0.13). The
// error is reported to GlitchTip: caught errors never reach the global
// handlers. Nothing about it is shown, since it may carry data.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <StatusScreen
      icon={<TriangleAlert className="size-6" />}
      title="Algo salió mal"
      description="Tuvimos un problema al mostrar esta pantalla. Probá de nuevo en unos segundos."
    >
      <Button size="lg" className="w-full" onClick={() => retry()}>
        Reintentar
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="w-full"
        render={<Link href="/" />}
        nativeButton={false}
      >
        Ir al inicio
      </Button>
    </StatusScreen>
  );
}
