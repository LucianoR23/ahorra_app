"use client";

import { Bell, Download, Plus, Share, Smartphone } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseForm } from "@/components/expense-form";
import { brand } from "@/config/brand";
import { FooterNote, PROGRESS_STEPS, StepLayout } from "./step-layout";

/** Step 1: what we call the user. */
export function NameStep({
  firstName,
  onChange,
  busy,
  error,
  onContinue,
  onSkip,
}: {
  firstName: string;
  onChange: (v: string) => void;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <form
      noValidate
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        onContinue();
      }}
    >
      <StepLayout
        progress={1}
        title="¿Cómo te llamamos?"
        description={`Así te saluda ${brand.name} y así te ven en un hogar compartido.`}
        onSkip={onSkip}
        footer={
          <>
            {error ? <Alert variant="error">{error}</Alert> : null}
            <Button type="submit" size="lg" className="w-full" disabled={busy || !firstName.trim()}>
              {busy ? "Guardando…" : "Continuar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="onboarding-name">Tu nombre</Label>
          <Input
            id="onboarding-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => onChange(e.target.value)}
            maxLength={60}
            autoFocus
          />
        </div>
      </StepLayout>
    </form>
  );
}

/** Step 4: the first expense, with the regular form until 3.1. */
export function ExpenseStep({ onCreated, onSkip }: { onCreated: () => void; onSkip: () => void }) {
  return (
    <StepLayout
      progress={4}
      title="Cargá tu primer gasto"
      description="Lo último que pagaste, por chico que sea. Así ves cómo queda."
      onSkip={onSkip}
    >
      <div className="pb-8">
        <ExpenseForm onCreated={onCreated} />
      </div>
    </StepLayout>
  );
}

/** After the first expense: ask for push permission. */
export function PushStep({
  busy,
  onEnable,
  onSkip,
}: {
  busy: boolean;
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <StepLayout
      progress={PROGRESS_STEPS}
      title="¿Te avisamos?"
      description="Te avisamos cuando se acerca un vencimiento y cuando alguien de tu hogar carga un gasto compartido."
      footer={
        <>
          <Button size="lg" className="w-full" disabled={busy} onClick={onEnable}>
            <Bell aria-hidden strokeWidth={1.75} />
            {busy ? "Activando…" : "Activar avisos"}
          </Button>
          <Button size="lg" variant="ghost" className="w-full" disabled={busy} onClick={onSkip}>
            Ahora no
          </Button>
        </>
      }
    />
  );
}

export type InstallPlatform = "ios" | "prompt";

const IOS_STEPS = [
  { icon: Share, title: "Tocá Compartir", desc: "En la barra de Safari." },
  { icon: Plus, title: "Elegí “Agregar a inicio”", desc: "Bajá en el menú si no lo ves." },
  { icon: Smartphone, title: "Confirmá con “Agregar”", desc: `${brand.name} queda en tu pantalla de inicio.` },
] as const;

/** Last step: install the app (the browser's prompt, or iOS instructions). */
export function InstallStep({
  platform,
  busy,
  onInstall,
  onDone,
}: {
  platform: InstallPlatform;
  busy: boolean;
  onInstall: () => void;
  onDone: () => void;
}) {
  return (
    <StepLayout
      progress={PROGRESS_STEPS}
      title={`Tené ${brand.name} a mano`}
      description="Instalada abre al toque, ocupa toda la pantalla y te puede mandar avisos."
      footer={
        platform === "prompt" ? (
          <>
            <Button size="lg" className="w-full" disabled={busy} onClick={onInstall}>
              <Download aria-hidden strokeWidth={1.75} />
              {busy ? "Instalando…" : "Instalar la app"}
            </Button>
            <Button size="lg" variant="ghost" className="w-full" disabled={busy} onClick={onDone}>
              Ahora no
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" className="w-full" onClick={onDone}>
              Listo
            </Button>
            <FooterNote>Funciona desde Safari, no desde Chrome en iPhone.</FooterNote>
          </>
        )
      }
    >
      {platform === "ios" ? (
        <ol className="flex flex-col gap-2.5">
          {IOS_STEPS.map((s, i) => (
            <li key={s.title} className="flex items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-caption font-bold text-brand-ink">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-semibold text-ink">{s.title}</span>
                <span className="text-caption text-ink-muted">{s.desc}</span>
              </span>
              <s.icon aria-hidden className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
            </li>
          ))}
        </ol>
      ) : null}
    </StepLayout>
  );
}
