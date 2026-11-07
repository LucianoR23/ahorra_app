import { CircleAlert, Info, type LucideIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "flex items-start gap-3 rounded-lg px-4 py-3 text-caption text-ink [&>svg]:mt-px [&>svg]:size-5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        error: "bg-negative-soft [&>svg]:text-negative",
        warning: "bg-brand-soft [&>svg]:text-brand-ink",
      },
    },
    defaultVariants: { variant: "warning" },
  }
)

const ICONS: Record<"error" | "warning", LucideIcon> = { error: CircleAlert, warning: Info }

/**
 * Inline notice (design "Avisos y resultado"). Errors are announced right
 * away (role="alert"); warnings politely (role="status").
 */
function Alert({
  className,
  variant = "warning",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const kind = variant ?? "warning"
  const Icon = ICONS[kind]
  return (
    <div
      data-slot="alert"
      role={kind === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant: kind }), className)}
      {...props}
    >
      <Icon aria-hidden strokeWidth={1.75} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export { Alert }
