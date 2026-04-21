"use client";

import { toast } from "sonner";
import { ApiError } from "./api/errors";

/** Muestra un toast coherente para cualquier error capturado. */
export function toastError(err: unknown, fallback = "Ocurrió un error inesperado"): void {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "rate_limited":
        toast.error("Demasiados intentos", {
          description:
            err.retryAfterSeconds && err.retryAfterSeconds > 0
              ? `Reintentá en ${err.retryAfterSeconds}s.`
              : "Esperá unos minutos e intentá de nuevo.",
        });
        return;
      case "network":
        toast.error("Sin conexión", { description: err.message });
        return;
      case "unauthorized":
        toast.error("Sesión expirada", { description: err.message });
        return;
      case "forbidden":
        toast.error("No tenés permisos", { description: err.message });
        return;
      case "internal":
        toast.error("Error del servidor", { description: err.message });
        return;
      default:
        toast.error(err.message || fallback);
        return;
    }
  }
  toast.error(fallback);
}

/** Re-export para que los forms llamen a toast.success/info con estilo consistente. */
export { toast };
