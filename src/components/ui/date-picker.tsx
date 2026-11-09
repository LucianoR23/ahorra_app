"use client"

import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { fieldControl } from "@/components/ui/field-styles"
import { fmtDateShort } from "@/lib/format"
import { Calendar } from "@/components/ui/calendar"

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function dateToIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

interface DatePickerProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Fecha mínima seleccionable. Bloquea días anteriores y la navegación a
   *  meses previos. Útil para "solo del mes en curso hacia adelante". */
  minDate?: Date
  "aria-invalid"?: boolean
  /** For a `<Label htmlFor>`. */
  id?: string
}

function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled,
  minDate,
  "aria-invalid": ariaInvalid,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = isoToDate(value)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          fieldControl,
          "flex cursor-pointer items-center gap-2",
          !value && "text-ink-muted",
          className
        )}
      >
        <CalendarIcon aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-ink-muted" />
        <span className="flex-1 text-left">
          {value ? fmtDateShort(value) : placeholder}
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          className="isolate z-50 outline-none"
          sideOffset={6}
          align="start"
        >
          <PopoverPrimitive.Popup
            className={cn(
              "z-50 rounded-xl bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              "duration-100 origin-(--transform-origin)"
            )}
          >
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  onChange(dateToIso(date))
                  setOpen(false)
                }
              }}
              locale={es}
              weekStartsOn={1}
              autoFocus
              {...(minDate ? { disabled: { before: minDate }, startMonth: minDate } : {})}
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { DatePicker }
