"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { DollarSign } from "lucide-react";
import { MenuGroup, MenuRow } from "@/components/ui/menu-list";
import { rowControl } from "@/components/ui/form-row";
import { RateSourceSelect } from "@/components/rate-source-select";
import { useExchangeRates } from "@/lib/api/hooks";
import { patchHousehold } from "@/lib/api/mutations";
import type { Household } from "@/lib/api/schemas";
import { rateSourceLabel, sourceOf } from "@/lib/fx";
import { toast, toastError } from "@/lib/toast";

/**
 * The dollar a space converts other currencies with (plan 5.1). The owner
 * changes it; anyone else sees it. Each expense or income can still pick
 * another one when it is loaded.
 */
export function FxSourceSetting({ household, editable, title }: { household: Household; editable: boolean; title: string }) {
  const { data: rates } = useExchangeRates();
  const current = sourceOf(household.fxSource);
  const [saving, setSaving] = useState(false);

  async function change(fxSource: string) {
    if (fxSource === current) return;
    setSaving(true);
    try {
      await patchHousehold(household.id, { name: household.name, baseCurrency: household.baseCurrency, fxSource });
      swrMutate((k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/households"), undefined, { revalidate: true });
      toast.success(`Ahora convierte al dólar ${rateSourceLabel(fxSource)}`);
    } catch (e) {
      toastError(e, "No se pudo cambiar la cotización");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MenuGroup
      title={title}
      footer="Los gastos e ingresos en otra moneda se pasan a pesos con este dólar. Al cargar cada uno podés elegir otro."
    >
      <MenuRow>
        <DollarSign aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
        <label htmlFor={`fx-${household.id}`} className="shrink-0 grow">
          Dólar para convertir
        </label>
        {editable ? (
          <RateSourceSelect id={`fx-${household.id}`} value={current} onValueChange={(v) => void change(v)} rates={rates} className={rowControl} />
        ) : (
          <span id={`fx-${household.id}`} className="text-caption text-ink-muted">
            {rateSourceLabel(current)}
          </span>
        )}
      </MenuRow>
      {saving ? <span className="sr-only" role="status">Guardando…</span> : null}
    </MenuGroup>
  );
}
