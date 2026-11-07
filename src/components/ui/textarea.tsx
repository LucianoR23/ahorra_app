import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldBase } from "@/components/ui/field-styles"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldBase,
        "field-sizing-content min-h-24 px-4 py-3",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
