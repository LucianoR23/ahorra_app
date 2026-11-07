import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The brand type scale (globals.css @theme: text-display, text-body, ...).
// Without this, tailwind-merge reads `text-body` as a color and drops the
// real text color next to it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "amount", "title", "heading", "body", "caption", "label"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
