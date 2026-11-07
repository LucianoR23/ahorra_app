// Shared look of text fields and pickers (design "Componentes" → Campos):
// 48 px, radius md, strong border for 3:1 contrast, focus ring in the
// focus token, negative border when invalid.
export const fieldBase =
  "w-full min-w-0 rounded-lg border border-input bg-surface text-body text-ink transition-colors duration-(--duration-fast) outline-none placeholder:text-ink-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-negative aria-invalid:ring-0"

export const fieldControl = `${fieldBase} h-12 px-4`
