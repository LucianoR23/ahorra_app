// Single source for the product name shown to users (plan 0.15b, 1.1).
// NEXT_PUBLIC_BRAND_* override the defaults at build time. Logos and icons
// come from the vendored brand kit (`pnpm brand:sync`), served at /brand/.
const name = process.env.NEXT_PUBLIC_BRAND_NAME || "Valuo";
const tagline = process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Sabé cuánto vale tu mes";
const description = process.env.NEXT_PUBLIC_BRAND_DESCRIPTION || "Gastos, tarjetas y cuotas, solo o en hogar.";

export const brand = {
  name,
  tagline,
  description,
  /** "<name> · <tagline>": page title, manifest name, social previews. */
  title: `${name} · ${tagline}`,
} as const;
