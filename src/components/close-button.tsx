"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Leaves a full-screen form: back where the user came from, or `fallback` on a fresh tab. */
export function CloseButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label="Cerrar"
      onClick={() => (window.history.length > 1 ? router.back() : router.replace(fallback))}
    >
      <X aria-hidden strokeWidth={1.75} />
    </Button>
  );
}
