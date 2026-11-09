"use client";

import useSWR from "swr";
import { Label } from "@/components/ui/label";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { Switch } from "@/components/ui/switch";
import { readPushAmounts, writePushAmounts } from "@/lib/push-amounts";
import { toastError } from "@/lib/toast";
import { useDiscreet, useDiscreetStore } from "@/stores/discreet";

const PUSH_AMOUNTS_KEY = "device:push-amounts";

/** Per-device privacy choices (plan 1.9). */
export function PrivacyCard() {
  const hidden = useDiscreet();
  const setHidden = useDiscreetStore((s) => s.setHidden);
  const { data: pushAmounts, mutate } = useSWR(PUSH_AMOUNTS_KEY, readPushAmounts);

  async function changePushAmounts(show: boolean) {
    try {
      await mutate(writePushAmounts(show).then(() => show), { optimisticData: show, rollbackOnError: true });
    } catch (e) {
      toastError(e, "No se pudo guardar en este dispositivo");
    }
  }

  return (
    <MenuGroup title="Privacidad en este dispositivo" footer="Útil si alguien puede ver tu pantalla. Vale solo para este dispositivo.">
      <MenuRow>
        <div className="min-w-0 flex-1">
          <Label htmlFor="discreet-mode" className="text-body font-normal">
            Modo discreto
          </Label>
          <p className="text-caption text-ink-muted">Oculta los montos en toda la app. También con el ojo de Inicio.</p>
        </div>
        <Switch id="discreet-mode" checked={hidden} onCheckedChange={setHidden} />
      </MenuRow>
      <MenuRow>
        <div className="min-w-0 flex-1">
          <Label htmlFor="push-amounts" className="text-body font-normal">
            Montos en las notificaciones
          </Label>
          <p className="text-caption text-ink-muted">Por defecto no dicen cuánto, por si aparecen con la pantalla bloqueada.</p>
        </div>
        <Switch id="push-amounts" checked={pushAmounts === true} disabled={pushAmounts === undefined} onCheckedChange={changePushAmounts} />
      </MenuRow>
    </MenuGroup>
  );
}
