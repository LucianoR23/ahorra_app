"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cardDraftError, defaultCardName, type CardDraft } from "@/lib/onboarding";
import { FooterNote, StepLayout } from "./step-layout";

const OTHER = "__other__";

/** Step 3: bank, closing and due day for each picked card. */
export function CardsStep({
  drafts,
  names,
  bankChoices,
  onChange,
  onNameChange,
  busy,
  error,
  onContinue,
  onSkip,
}: {
  drafts: CardDraft[];
  /** Custom names by draft key; "" or missing means the default name. */
  names: Record<string, string>;
  bankChoices: string[];
  onChange: (key: string, patch: Partial<CardDraft>) => void;
  onNameChange: (key: string, name: string) => void;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const incomplete = drafts.some((d) => cardDraftError(d) !== null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (incomplete) {
      setShowErrors(true);
      return;
    }
    onContinue();
  }

  return (
    <form onSubmit={submit} noValidate className="contents">
      <StepLayout
        progress={3}
        title={drafts.length === 1 ? "Tu tarjeta" : "Tus tarjetas"}
        description="Con el día de cierre y el de vencimiento sabemos en qué resumen cae cada compra y cada cuota."
        onSkip={onSkip}
        footer={
          <>
            {error ? <Alert variant="error">{error}</Alert> : null}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Guardando…" : "Continuar"}
            </Button>
            <FooterNote>Los días los podés cambiar cuando quieras en Tarjetas.</FooterNote>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          {drafts.map((d) => (
            <CardDraftForm
              key={d.key}
              draft={d}
              name={names[d.key] ?? ""}
              bankChoices={bankChoices}
              showError={showErrors}
              onChange={(patch) => onChange(d.key, patch)}
              onNameChange={(n) => onNameChange(d.key, n)}
            />
          ))}
        </div>
      </StepLayout>
    </form>
  );
}

function CardDraftForm({
  draft,
  name,
  bankChoices,
  showError,
  onChange,
  onNameChange,
}: {
  draft: CardDraft;
  name: string;
  bankChoices: string[];
  showError: boolean;
  onChange: (patch: Partial<CardDraft>) => void;
  onNameChange: (name: string) => void;
}) {
  const [other, setOther] = useState(false);
  const id = `card-${draft.key}`;
  const fallbackName = defaultCardName(draft.network, draft.bank);
  const error = showError ? cardDraftError(draft) : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CreditCard aria-hidden className="size-5.5 shrink-0" strokeWidth={1.75} />
          <h2 className="text-heading text-ink">{fallbackName}</h2>
        </div>

        {draft.bankLocked ? null : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-bank`}>Banco</Label>
            <Select
              value={other ? OTHER : draft.bank}
              onValueChange={(v) => {
                if (v === OTHER) {
                  setOther(true);
                  onChange({ bank: "" });
                } else {
                  setOther(false);
                  onChange({ bank: v });
                }
              }}
            >
              <SelectTrigger id={`${id}-bank`} aria-invalid={showError && !draft.bank.trim() ? true : undefined}>
                <SelectValue placeholder="Elegí el banco">
                  {(v: string | null) => (v === OTHER ? "Otro" : v || "Elegí el banco")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bankChoices.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER}>Otro</SelectItem>
              </SelectContent>
            </Select>
            {other ? (
              <Input
                aria-label="Nombre del banco"
                placeholder="Nombre del banco"
                value={draft.bank}
                onChange={(e) => onChange({ bank: e.target.value })}
                maxLength={60}
              />
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-closing`}>Día de cierre</Label>
            <Input
              id={`${id}-closing`}
              inputMode="numeric"
              placeholder="Ej. 25"
              maxLength={2}
              value={draft.closingDay}
              onChange={(e) => onChange({ closingDay: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-due`}>Día de vencimiento</Label>
            <Input
              id={`${id}-due`}
              inputMode="numeric"
              placeholder="Ej. 5"
              maxLength={2}
              value={draft.dueDay}
              onChange={(e) => onChange({ dueDay: e.target.value.replace(/\D/g, "") })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>Nombre</Label>
          <Input
            id={`${id}-name`}
            placeholder={fallbackName}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={60}
          />
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}
      </CardContent>
    </Card>
  );
}
