import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Design "Componentes" → Botones: pill, 48 px tall, one primary action per
// screen. Focus ring = focus token, 2 px with 2 px offset.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-colors duration-(--duration-fast) outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:bg-surface-2 disabled:text-ink-muted disabled:border-transparent aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        outline:
          "border-border-strong bg-surface text-ink hover:bg-surface-2 aria-expanded:bg-surface-2",
        secondary:
          "bg-surface-2 text-ink hover:bg-border aria-expanded:bg-border",
        ghost:
          "text-ink hover:bg-surface-2 aria-expanded:bg-surface-2",
        destructive:
          "bg-negative text-white hover:bg-negative/85",
        "destructive-link":
          "h-auto! rounded-sm px-0! text-negative hover:underline underline-offset-4 disabled:bg-transparent",
        link: "h-auto! rounded-sm px-0! text-brand-ink hover:underline underline-offset-4 disabled:bg-transparent",
      },
      size: {
        default:
          "h-12 gap-2 px-6 text-body font-semibold has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5 [&_svg:not([class*='size-'])]:size-5",
        xs: "h-8 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 gap-1.5 px-4 text-caption font-semibold [&_svg:not([class*='size-'])]:size-4",
        lg: "h-14 gap-2 px-7 text-body font-semibold [&_svg:not([class*='size-'])]:size-5",
        icon: "size-11 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-10 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
