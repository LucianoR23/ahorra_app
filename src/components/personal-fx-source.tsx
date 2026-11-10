"use client";

import { FxSourceSetting } from "@/components/fx-source-setting";
import { useSpaces } from "@/lib/spaces";

/** Mi plata's dollar in Ajustes (plan 5.1); the hogar's lives in Hogar. */
export function PersonalFxSource() {
  const { personal } = useSpaces();
  if (!personal) return null;
  return <FxSourceSetting household={personal} editable title="Cotización de Mi plata" />;
}
