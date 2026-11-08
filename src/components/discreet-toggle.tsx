"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useDiscreet, useDiscreetStore } from "@/stores/discreet";

/** The eye button (design `ModoDiscreto`): pressed while amounts are hidden. */
export function DiscreetToggle() {
  const hidden = useDiscreet();
  const setHidden = useDiscreetStore((s) => s.setHidden);

  function toggle() {
    setHidden(!hidden);
    toast(hidden ? "Montos visibles otra vez." : "Montos ocultos en toda la app. Tocá el ojo para verlos.");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={hidden ? "Mostrar montos" : "Ocultar montos"}
      aria-pressed={hidden}
      onClick={toggle}
    >
      {hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
    </Button>
  );
}
