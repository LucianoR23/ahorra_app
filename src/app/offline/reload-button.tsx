"use client";

import { Button } from "@/components/ui/button";

/**
 * The service worker serves the offline page under the URL that failed, so a
 * reload asks for that page again.
 */
export function ReloadButton() {
  return (
    <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
      Reintentar
    </Button>
  );
}
