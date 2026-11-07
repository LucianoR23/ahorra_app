import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { fieldControl } from "@/components/ui/field-styles"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldControl,
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-caption file:font-medium file:text-ink",
        className
      )}
      {...props}
    />
  )
}

export { Input }
