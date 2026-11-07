import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Screen title (design "Encabezado de página"): big title, optional hint
 * below and one action on the right (usually the help button). With `back`
 * it shows the round "volver" button and a smaller title.
 */
function PageHeader({
  title,
  description,
  action,
  back,
  className,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  back?: { href: string; label?: string }
  className?: string
}) {
  return (
    <header data-slot="page-header" className={cn("mb-4 flex items-start gap-3", className)}>
      {back ? (
        <Link
          href={back.href}
          aria-label={back.label ?? "Volver"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink outline-none transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} />
        </Link>
      ) : null}
      <div className={cn("min-w-0 flex-1", back && "self-center")}>
        <h1 className={cn("text-ink", back ? "text-title" : "text-[1.75rem] leading-tight font-extrabold tracking-tight")}>
          {title}
        </h1>
        {description ? <p className="mt-1 text-caption text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export { PageHeader }
