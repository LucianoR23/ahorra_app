"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDiscreet, useDiscreetStore } from "@/stores/discreet";

/** Per-device privacy choices (plan 1.9). */
export function PrivacyCard() {
  const hidden = useDiscreet();
  const setHidden = useDiscreetStore((s) => s.setHidden);

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
      </CardContent>
    </Card>
  );
}
