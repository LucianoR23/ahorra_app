"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Rule = {
  label: string;
  test: (pw: string) => boolean;
  /** Si es true, cumplirla no es obligatorio pero se sugiere. */
  optional?: boolean;
};

const RULES: Rule[] = [
  { label: "Al menos 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Una mayúscula (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "Una minúscula (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "Un número (0-9)", test: (p) => /[0-9]/.test(p) },
  {
    label: "Un carácter especial (sugerido)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
    optional: true,
  },
];

/** Devuelve true si la contraseña cumple todas las reglas obligatorias. */
export function isPasswordStrongEnough(password: string): boolean {
  return RULES.filter((r) => !r.optional).every((r) => r.test(password));
}

/** Score 0-4 basado en reglas cumplidas (obligatorias + sugerida). */
export function passwordScore(password: string): number {
  if (!password) return 0;
  return RULES.reduce((acc, r) => acc + (r.test(password) ? 1 : 0), 0);
}

export function PasswordStrengthMeter({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const score = passwordScore(password);
  const total = RULES.length;
  const pct = Math.round((score / total) * 100);

  const color =
    score <= 1
      ? "bg-destructive"
      : score === 2
        ? "bg-orange-500"
        : score === 3
          ? "bg-yellow-500"
          : score === 4
            ? "bg-emerald-500"
            : "bg-emerald-600";

  const label =
    score <= 1 ? "Muy débil" : score === 2 ? "Débil" : score === 3 ? "Aceptable" : score === 4 ? "Fuerte" : "Excelente";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", color)}
            style={{ width: password ? `${Math.max(pct, 8)}%` : "0%" }}
          />
        </div>
        {password && (
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
            {label}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1 text-[11px]">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li
              key={r.label}
              className={cn(
                "flex items-center gap-1.5",
                ok
                  ? "text-emerald-500"
                  : r.optional
                    ? "text-muted-foreground/70"
                    : "text-muted-foreground",
              )}
            >
              {ok ? <Check className="size-3" /> : <X className="size-3 opacity-60" />}
              <span>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
