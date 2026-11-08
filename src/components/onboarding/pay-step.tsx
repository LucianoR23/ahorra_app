"use client";

import { Banknote, CreditCard, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckCard } from "@/components/ui/check-card";
import { Segmented } from "@/components/ui/segmented";
import { PAY_OPTIONS, type PayOption } from "@/lib/onboarding";
import { FooterNote, StepLayout } from "./step-layout";

const ICONS: Record<(typeof PAY_OPTIONS)[number]["kind"], LucideIcon> = {
  card: CreditCard,
  wallet: Wallet,
  cash: Banknote,
};

/** Step 2: "¿Cómo pagás?" (the design's screen). */
export function PayStep({
  firstName,
  selected,
  onToggle,
  hasMercadoPagoCard,
  onMercadoPagoCardChange,
  busy,
  onContinue,
  onSkip,
}: {
  firstName: string;
  selected: ReadonlySet<PayOption>;
  onToggle: (option: PayOption, on: boolean) => void;
  hasMercadoPagoCard: boolean;
  onMercadoPagoCardChange: (has: boolean) => void;
  busy: boolean;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const count = selected.size;
  const name = firstName.trim();
  return (
    <StepLayout
      progress={2}
      title={name ? `¿Cómo pagás, ${name}?` : "¿Cómo pagás?"}
      description="Marcá tus tarjetas y billeteras. En el próximo paso cargás el cierre y el vencimiento de cada tarjeta, así tus cuotas caen en el resumen correcto."
      onSkip={onSkip}
      footer={
        <>
          <Button size="lg" className="w-full" disabled={count === 0 || busy} onClick={onContinue}>
            {busy ? "Guardando…" : count === 0 ? "Continuar" : `Continuar · ${count} ${count === 1 ? "elegido" : "elegidos"}`}
          </Button>
          <FooterNote>Después podés agregar o cambiar medios de pago en Tarjetas.</FooterNote>
        </>
      }
    >
      <div role="group" aria-label="Medios de pago" className="flex flex-col gap-2.5">
        {PAY_OPTIONS.map((o) => (
          <div key={o.value} className="flex flex-col gap-2.5">
            <CheckCard
              icon={ICONS[o.kind]}
              label={o.label}
              description={o.kind === "card" && selected.has(o.value) ? "Banco: elegilo después" : undefined}
              checked={selected.has(o.value)}
              onCheckedChange={(on) => onToggle(o.value, on)}
            />
            {o.value === "mercadopago" && selected.has("mercadopago") ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
                <p id="mp-card-question" className="text-caption font-semibold text-ink">
                  ¿Tenés la tarjeta de crédito de Mercado Pago?
                </p>
                <Segmented
                  aria-labelledby="mp-card-question"
                  value={hasMercadoPagoCard ? "yes" : "no"}
                  onValueChange={(v) => onMercadoPagoCardChange(v === "yes")}
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Sí" },
                  ]}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </StepLayout>
  );
}
