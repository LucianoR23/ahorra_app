// Single source for the product name shown to users (plan 0.15b). Values come
// from NEXT_PUBLIC_BRAND_* at build time; the defaults are today's name. The
// switch to Valuo (values plus logo, icons and manifest assets) is item 1.1.
const name = process.env.NEXT_PUBLIC_BRAND_NAME || "Ahorro";
const tagline = process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Personal Finance Coach";
const description = process.env.NEXT_PUBLIC_BRAND_DESCRIPTION || "Gestión de gastos compartidos, multi-moneda.";

export const brand = {
  name,
  tagline,
  description,
  /** "<name> — <tagline>": page title, manifest name, social previews. */
  title: `${name} — ${tagline}`,
} as const;
