"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Etiqueta del botón eye (para lectores de pantalla). */
  toggleAriaLabel?: { show: string; hide: string };
};

export function PasswordInput({
  className,
  toggleAriaLabel,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = React.useState(false);
  const labels = toggleAriaLabel ?? {
    show: "Mostrar contraseña",
    hide: "Ocultar contraseña",
  };

  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={show ? labels.hide : labels.show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
