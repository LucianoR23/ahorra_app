"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

type SelectRootProps = React.ComponentProps<typeof SelectPrimitive.Root>

// Base UI tipa onValueChange como (unknown | null), pero en este codebase
// usamos "" como sentinel de "sin selección". Normalizamos para que los call
// sites puedan pasar setters de useState<string> sin castear cada vez.
function Select({
  onValueChange,
  ...props
}: Omit<SelectRootProps, "onValueChange"> & {
  onValueChange?: (value: string) => void
}) {
  const handler: SelectRootProps["onValueChange"] = onValueChange
    ? (value) => onValueChange(((value as string | null) ?? ""))
    : undefined
  return <SelectPrimitive.Root {...props} onValueChange={handler} />
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-slot="select-trigger"
    className={cn(
      "flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-input/20 px-3 text-sm outline-none transition-colors",
      "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "dark:bg-input/30",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon className="ml-2 shrink-0 text-muted-foreground">
      <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = SelectPrimitive.Value

function SelectContent({
  className,
  children,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> & { sideOffset?: number }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="isolate z-50 outline-none"
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    data-slot="select-item"
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pr-2 pl-7 text-sm outline-none transition-colors",
      "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
      "data-disabled:pointer-events-none data-disabled:opacity-50 data-disabled:cursor-not-allowed",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemIndicator className="absolute left-1.5 flex items-center justify-center">
      <HugeiconsIcon icon={Tick02Icon} size={14} />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
