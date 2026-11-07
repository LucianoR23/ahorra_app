// Read access to the vendored brand tokens (brand/tokens.json, synced from the
// workspace). For places that can't use the CSS variables, like generated
// images. Screens use the theme variables instead.
import tokens from "../../brand/tokens.json";

type Theme = "light" | "dark";

/** The value of a brand color token for a theme. Throws on an unknown name. */
export function brandColor(name: string, theme: Theme): string {
  const token = tokens.color.tokens.find((t) => t.name === name);
  const value = token?.value as Partial<Record<Theme, string>> | string | undefined;
  const color = typeof value === "string" ? value : value?.[theme];
  if (!color) throw new Error(`brand: no color token "${name}" for ${theme}`);
  return color;
}
