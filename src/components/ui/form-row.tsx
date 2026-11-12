import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * A control inside a data row (design `CargarGasto`): no box,
 * right-aligned, still focusable and visible on hover.
 */
export const rowControl =
  "h-11 w-auto min-w-0 max-w-[62%] justify-end gap-2 border-transparent bg-transparent px-2 text-right font-semibold hover:bg-surface-2 aria-invalid:border-negative"

/**
 * A data row of a form (design `CargarGasto`): label on the left, its
 * control on the right, the error under it. Rows go in a card split by
 * hairlines (`divide-y`).
 */
export function FormRow({
  label,
  htmlFor,
  error,
  hint,
  bare,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  /** A quiet note under the control, hidden while there is an error. */
  hint?: string
  /** Inside a block that already has the padding and the divider. */
  bare?: boolean
  children: React.ReactNode
}) {
  return (
    <div data-slot="form-row" className={cn("flex flex-col", !bare && "py-2")}>
      <div className="flex min-h-12 items-center justify-between gap-4">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="shrink-0 text-body font-normal text-ink-muted">
            {label}
          </Label>
        ) : (
          <span className="shrink-0 text-body text-ink-muted">{label}</span>
        )}
        {children}
      </div>
      {error && <p className="text-right text-caption text-negative">{error}</p>}
      {!error && hint && <p className="text-right text-caption text-ink-muted">{hint}</p>}
    </div>
  )
}
