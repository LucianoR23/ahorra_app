"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Filter chip (design `Movimientos`, "Chips de filtro" in `Componentes`): a
 * 44 px pill, ink fill when pressed. Pass `pressed` for a toggle; leave it
 * out when the chip opens a menu (it then gets `aria-expanded` from the
 * menu trigger and shows "selected" with `active`).
 */
function Chip({
  pressed,
  active,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { pressed?: boolean; active?: boolean }) {
  const on = pressed ?? active ?? false
  return (
    <button
      data-slot="chip"
      type={type}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-body font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-(--duration-fast) ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-ink hover:border-border-strong",
        className
      )}
      {...props}
    />
  )
}

export { Chip }
