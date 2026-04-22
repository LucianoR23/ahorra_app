"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { Loader2, Home, UserPlus, Check, ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createHousehold, createHouseholdInvite } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import type { Currency } from "@/lib/api/schemas";

const EMAIL_RE = /^[^\s@]+@[a-zA-Z0-9-]+(\.[a-zA-Z]+)+$/;

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);
  const setCurrentId = useHouseholdStore((s) => s.setCurrentId);

  const [step, setStep] = useState<1 | 2>(1);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [lastInviteEmailSent, setLastInviteEmailSent] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (hydrated && user && currentHouseholdId && step === 1 && !createdId) {
      router.replace("/");
    }
  }, [hydrated, user, currentHouseholdId, step, createdId, router]);

  if (!hydrated || !user) {
    return (
      <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setFormErr("Ingresá un nombre para el hogar");
      return;
    }
    setBusy(true);
    try {
      const hh = await createHousehold({ name: trimmed, baseCurrency: currency });
      setCurrentId(hh.id);
      setCreatedId(hh.id);
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/households"),
        undefined,
        { revalidate: true },
      );
      setStep(2);
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "No se pudo crear el hogar");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!createdId) return;
    const trimmed = inviteEmail.trim();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setInviteErr("Ingresá un email válido (ej: nombre@dominio.com)");
      setInviteOk(false);
      return;
    }
    setInviteErr(null);
    setInviteOk(false);
    setLastInviteUrl(null);
    setLastInviteEmailSent(false);
    setInviteBusy(true);
    try {
      const res = await createHouseholdInvite(createdId, trimmed);
      setInviteOk(true);
      setInviteEmail("");
      setLastInviteUrl(res.acceptUrl);
      setLastInviteEmailSent(res.emailSent);
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith(`/households/${createdId}/invites`),
        undefined,
        { revalidate: true },
      );
    } catch (err) {
      setInviteErr(err instanceof ApiError ? err.message : "No se pudo enviar la invitación");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInviteUrl() {
    if (!lastInviteUrl) return;
    try {
      await navigator.clipboard.writeText(lastInviteUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  }

  function finish() {
    router.replace("/");
  }

  return (
    <div className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <StepDot active={step === 1} done={step > 1} label="1" />
          <div className="h-px w-10 bg-border" />
          <StepDot active={step === 2} done={false} label="2" />
        </div>

        {step === 1 ? (
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Home className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Creá tu hogar</h1>
                <p className="text-sm text-muted-foreground">
                  Un hogar agrupa gastos, ingresos y miembros.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hh-name">Nombre del hogar</Label>
                <Input
                  id="hh-name"
                  placeholder="Casa, Familia, Depto..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  disabled={busy}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hh-currency">Moneda base</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)} disabled={busy}>
                  <SelectTrigger id="hh-currency" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS — Peso argentino</SelectItem>
                    <SelectItem value="USD">USD — Dólar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Todos los montos se convierten a esta moneda para reportes.
                </p>
              </div>

              {formErr && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {formErr}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Creando…
                  </>
                ) : (
                  <>
                    Continuar <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Invitá a alguien</h1>
                <p className="text-sm text-muted-foreground">
                  Opcional — podés invitar miembros ahora o más tarde desde Ajustes.
                </p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email del usuario</Label>
                <Input
                  id="invite-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="correo@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteErr) setInviteErr(null);
                  }}
                  aria-invalid={!!inviteErr}
                  disabled={inviteBusy}
                />
                <p className="text-[11px] text-muted-foreground">
                  Le mandamos un mail con el link para unirse al hogar.
                </p>
              </div>

              {inviteErr && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {inviteErr}
                </div>
              )}
              {inviteOk && (
                <div className="space-y-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5" />
                    {lastInviteEmailSent
                      ? "Invitación enviada por email."
                      : "Invitación creada. Compartí el link manualmente."}
                  </div>
                  {lastInviteUrl && (
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={lastInviteUrl}
                        className="h-7 flex-1 bg-background text-[11px]"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={copyInviteUrl}
                      >
                        <Copy className="size-3" /> Copiar
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                variant="outline"
                className="w-full"
                disabled={inviteBusy || !inviteEmail.trim()}
              >
                {inviteBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Enviar invitación
              </Button>
            </form>

            <Button
              type="button"
              size="lg"
              className="mt-3 w-full"
              onClick={finish}
            >
              {inviteOk ? "Ir a mi hogar" : "Saltar por ahora"}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={
        "grid size-7 place-items-center rounded-full border text-[11px] font-semibold transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : done
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground")
      }
    >
      {done ? <Check className="size-3.5" /> : label}
    </div>
  );
}
