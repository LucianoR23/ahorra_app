"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { es } from "date-fns/locale"
import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
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
  "aria-invalid"?: boolean
}

function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = isoToDate(value)

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors",
          "hover:bg-input/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
          "dark:bg-input/30",
          !value && "text-muted-foreground",
          className
        )}
      >
        <HugeiconsIcon icon={Calendar01Icon} size={14} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left text-xs">
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
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { DatePicker }
