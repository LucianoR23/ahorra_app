import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Grouped settings-style list (design `Mas`): a caption, then a card of
 * rows split by hairlines. Every settings screen uses it.
 */
function MenuGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: string
  /** A hint under the group, like iOS settings. */
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section data-slot="menu-group" aria-label={title} className={cn("flex flex-col gap-2", className)}>
      {title ? <h2 className="px-1 text-caption font-semibold text-ink-muted">{title}</h2> : null}
      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card px-4 shadow-card dark:ring-1 dark:ring-border">
        {children}
      </ul>
      {footer ? <p className="px-1 text-caption text-ink-muted">{footer}</p> : null}
    </section>
  )
}

/** A row with its own content (a switch, a segmented control, a device). */
function MenuRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <li data-slot="menu-row" className={cn("flex min-h-14 items-center gap-4 py-3 text-body text-ink", className)}>
      {children}
    </li>
  )
}

const rowClass =
  "flex min-h-14 w-full cursor-pointer items-center gap-4 py-3 text-left text-body text-ink outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"

/** A row: icon, label, optional detail on the right, chevron for links. */
function MenuItem({
  icon: Icon,
  label,
  detail,
  href,
  onClick,
  tone = "default",
}: {
  icon?: LucideIcon
  label: string
  detail?: React.ReactNode
  href?: string
  onClick?: () => void
  tone?: "default" | "destructive"
}) {
  const content = (
    <>
      {Icon ? <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} /> : null}
      <span className={detail ? "shrink-0 grow" : "min-w-0 flex-1"}>{label}</span>
      {detail ? <span className="line-clamp-2 min-w-0 text-right text-caption text-ink-muted [overflow-wrap:anywhere]">{detail}</span> : null}
      {href ? <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} /> : null}
    </>
  )
  return (
    <li data-slot="menu-item">
      {href ? (
        <Link href={href} className={rowClass}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cn(rowClass, tone === "destructive" && "text-negative")}>
          {content}
        </button>
      )}
    </li>
  )
}

export { MenuGroup, MenuItem, MenuRow }
