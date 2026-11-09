"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { useIsClient } from "@/lib/hooks";

export type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: readonly SegmentedOption<ThemeChoice>[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

function isThemeChoice(value: string | undefined): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/** Theme override (plan 1.10a): the app follows the OS unless you pick one. */
export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();
  // next-themes only knows the stored choice on the client.
  const value: ThemeChoice = mounted && isThemeChoice(theme) ? theme : "system";

  return (
    <MenuGroup title="Apariencia" footer="Por defecto sigue el tema de tu dispositivo.">
      <MenuRow>
        <Segmented aria-label="Apariencia" value={value} onValueChange={setTheme} options={OPTIONS} />
      </MenuRow>
    </MenuGroup>
  );
}
