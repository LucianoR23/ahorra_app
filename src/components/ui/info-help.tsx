"use client"

import * as React from "react"
import Link from "next/link"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  InformationCircleIcon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Link01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * Contenido estructurado que se muestra dentro del overlay de ayuda.
 * Cada arista vacía oculta su sección correspondiente.
 */
export type InfoHelpContent = {
  /** Título del overlay (también da el `aria-label` por defecto del botón). */
  titulo: string
  /** Bullets de la sección "Qué podés hacer acá". */
  acciones: string[]
  /** Bullets de la sección "Tené en cuenta". */
  consideraciones: string[]
  /** Pantallas vinculadas, navegables desde el overlay. Sección opcional. */
  relacionado?: { label: string; href: string }[]
}

type InfoHelpButtonSize = "icon-xs" | "icon-sm" | "icon" | "icon-lg"
type InfoHelpButtonVariant = "ghost" | "outline" | "secondary"

export type InfoHelpProps = {
  /** Contenido estructurado del overlay. */
  content: InfoHelpContent
  /**
   * `aria-label` del botón disparador.
   * Default: `Ayuda: ${content.titulo}`.
   */
  label?: string
  /**
   * Clases para posicionar/ajustar el botón disparador.
   * @example "absolute right-2 top-2" — fija el botón en la esquina de un Card.
   */
  className?: string
  /** Tamaño del botón ícono. Default `"icon-sm"`. */
  size?: InfoHelpButtonSize
  /** Variante visual del botón. Default `"ghost"` (discreto). */
  variant?: InfoHelpButtonVariant
}

const ACCIONES_LABEL = "Qué podés hacer acá"
const CONSIDERACIONES_LABEL = "Tené en cuenta"
const RELACIONADO_LABEL = "Pantallas relacionadas"

function HelpSection({
  icon,
  iconClassName,
  title,
  items,
}: {
  icon: IconSvgElement
  iconClassName?: string
  title: string
  items: string[]
}) {
  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 font-heading text-xs font-medium text-foreground">
        <HugeiconsIcon
          icon={icon}
          className={cn("size-3.5", iconClassName)}
          strokeWidth={2}
          aria-hidden
        />
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5 pl-0.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-xs/relaxed text-muted-foreground"
          >
            <span
              aria-hidden
              className="mt-1.75 size-1 shrink-0 rounded-full bg-current opacity-40"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Botón de ayuda reutilizable. Muestra un ícono `Info` discreto que abre un
 * overlay responsive con dos secciones: "Qué podés hacer acá" y "Tené en cuenta".
 *
 * - **Desktop** (`≥ 768px`): `Dialog` centrado.
 * - **Mobile** (`< 768px`): `Sheet` deslizable desde abajo.
 *
 * Ambas primitivas (Base UI) ya traen foco atrapado, cierre con `Esc` y click
 * fuera, y `aria-labelledby` derivado del título. El `breakpoint` se evalúa con
 * `useMediaQuery` (SSR-safe; sin flash de hidratación).
 *
 * @example
 * // Posicionado en la esquina de un Card, contenido estructurado:
 * <Card className="relative">
 *   <InfoHelp
 *     className="absolute right-2 top-2"
 *     content={{
 *       titulo: "Gastos recurrentes",
 *       acciones: [
 *         "Crear un gasto que se repite cada mes desde una fecha de inicio.",
 *         "Pausar o eliminar un recurrente sin borrar los movimientos pasados.",
 *       ],
 *       consideraciones: [
 *         "El primer cargo se genera en la fecha de inicio que elijas.",
 *         "Editar el monto no afecta los movimientos ya registrados.",
 *       ],
 *       relacionado: [{ label: "Categorías", href: "/categorias" }],
 *     }}
 *   />
 *   ...
 * </Card>
 */
export function InfoHelp({
  content,
  label,
  className,
  size = "icon-sm",
  variant = "ghost",
}: InfoHelpProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const ariaLabel = label ?? `Ayuda: ${content.titulo}`

  // El mismo botón se usa como `render` del Trigger en ambas ramas.
  const triggerButton = (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      aria-label={ariaLabel}
    />
  )

  const triggerIcon = (
    <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} aria-hidden />
  )

  const sections = (
    <div className="flex flex-col gap-4">
      <HelpSection
        icon={CheckmarkCircle02Icon}
        iconClassName="text-primary"
        title={ACCIONES_LABEL}
        items={content.acciones}
      />
      <HelpSection
        icon={Alert02Icon}
        iconClassName="text-foreground/60"
        title={CONSIDERACIONES_LABEL}
        items={content.consideraciones}
      />
      {content.relacionado && content.relacionado.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 font-heading text-xs font-medium text-foreground">
            <HugeiconsIcon
              icon={Link01Icon}
              className="size-3.5 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            {RELACIONADO_LABEL}
          </h3>
          <div className="flex flex-col gap-0.5">
            {content.relacionado.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs/relaxed font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>{r.label}</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  const titleWithIcon = (
    <>
      <HugeiconsIcon
        icon={InformationCircleIcon}
        className="size-4 text-muted-foreground"
        strokeWidth={2}
        aria-hidden
      />
      {content.titulo}
    </>
  )

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger render={triggerButton}>{triggerIcon}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {titleWithIcon}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Información de ayuda sobre esta sección.
            </DialogDescription>
          </DialogHeader>
          {sections}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet>
      <SheetTrigger render={triggerButton}>{triggerIcon}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85svh] gap-0 pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {titleWithIcon}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Información de ayuda sobre esta sección.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-6 pb-6">{sections}</div>
      </SheetContent>
    </Sheet>
  )
}
