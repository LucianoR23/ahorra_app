"use client";

import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
    <Card>
      <CardHeader>
        <CardTitle>Privacidad en este dispositivo</CardTitle>
        <CardDescription>Útil si alguien puede ver tu pantalla.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="discreet-mode">Modo discreto</Label>
            <p className="text-caption text-muted-foreground">
              Oculta los montos en toda la app. También con el ojo de Inicio.
            </p>
          </div>
          <Switch id="discreet-mode" checked={hidden} onCheckedChange={setHidden} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="push-amounts">Montos en las notificaciones</Label>
            <p className="text-caption text-muted-foreground">
              Por defecto las notificaciones no dicen cuánto, por si aparecen con la pantalla bloqueada.
            </p>
          </div>
          <Switch
            id="push-amounts"
            checked={pushAmounts === true}
            disabled={pushAmounts === undefined}
            onCheckedChange={changePushAmounts}
          />
        </div>
      </CardContent>
    </Card>
  );
}
