"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Bell, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MenuGroup, MenuItem, MenuRow } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { adminSendTestPush, generateInsights } from "@/lib/api/mutations";
import { toast, toastError } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth";

/** Superadmin tools (plan 1.11): the account's role and the test helpers. */
export function AdminTools() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Herramientas" description="Para probar cambios en staging o en tu cuenta." className="mb-0" />
      <MenuGroup title="Cuenta" footer="Este rol es de la app, no depende de tu rol en un hogar.">
        <MenuRow>
          <ShieldCheck aria-hidden className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate">{user?.email}</span>
          <span className="text-caption text-ink-muted">Superadmin</span>
        </MenuRow>
      </MenuGroup>
      <MenuGroup title="Pruebas">
        <GenerateInsightsItem />
        <TestPushItem />
      </MenuGroup>
    </div>
  );
}

function TestPushItem() {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      const r = await adminSendTestPush();
      if (r.sent) toast.success(`Push enviada a ${r.subscriptions} dispositivo(s)`);
      else toast.error(r.reason ?? "No se pudo enviar la push");
    } catch (e) {
      toastError(e, "No se pudo enviar la push");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MenuItem
      icon={busy ? Loader2 : Bell}
      label="Enviar push de prueba"
      detail="A tus dispositivos"
      onClick={busy ? undefined : handle}
    />
  );
}

function GenerateInsightsItem() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState("");
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  async function handle() {
    setBusy(true);
    setResult(null);
    try {
      const r = await generateInsights(at || undefined);
      setResult(r);
      swrMutate((k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/insights"), undefined, {
        revalidate: true,
      });
      toast.success("Insights generados");
    } catch (e) {
      toastError(e, "No se pudieron generar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <MenuItem icon={Sparkles} label="Regenerar insights" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setResult(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerar insights</DialogTitle>
            <DialogDescription>Corre el motor para todos los hogares. Sirve para probar cambios.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="insights-at">Fecha</Label>
            <DatePicker id="insights-at" value={at} onChange={setAt} placeholder="Hoy" />
            <p className="text-caption text-ink-muted">Vacía, usa la de hoy.</p>
          </div>
          {result && (
            <p role="status" className="text-body text-ink">
              {result.created} creados
              {result.failed > 0 && <span className="text-negative"> · {result.failed} fallidos</span>}
            </p>
          )}
          <Button type="button" size="lg" className="w-full" onClick={handle} disabled={busy}>
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {busy ? "Generando…" : "Generar ahora"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
