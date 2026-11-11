"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { createHousehold } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { useHouseholdStore } from "@/stores/household";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const NUEVO_HOGAR_HELP: InfoHelpContent = {
  titulo: "Crear nuevo hogar",
  acciones: [
    "Ponele un nombre al hogar (Casa, Familia, Depto…).",
    "Creá el hogar: quedás como dueño y pasa a ser tu hogar activo.",
  ],
  consideraciones: [
    "Vas a ser el dueño del hogar; podés invitar miembros después desde Hogar.",
    "Los totales van en pesos. Los gastos e ingresos en dólares o euros se cargan en su moneda y se suman convertidos.",
    "Al crearlo, se vuelve tu hogar activo y te lleva a Hogar.",
  ],
  relacionado: [{ label: "Volver al hogar", href: "/hogar" }],
};

export default function Page() {
  return (
    <AppShell>
      <NewHouseholdInner />
    </AppShell>
  );
}

function NewHouseholdInner() {
  const router = useRouter();
  const setCurrentId = useHouseholdStore((s) => s.setCurrentId);

  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setErr("Ingresá un nombre para el hogar");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const hh = await createHousehold({ name: trimmed });
      setCurrentId(hh.id);
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/households"),
        undefined,
        { revalidate: true },
      );
      // Drop household-scoped caches so the switch to the new hogar reflects empty state.
      swrMutate(() => true, undefined, { revalidate: true });
      toast.success(`Hogar "${hh.name}" creado`);
      router.replace("/hogar");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo crear el hogar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageHeader
        title="Crear hogar"
        description="Vas a ser el dueño. Después invitás a quien quieras."
        back={{ href: "/hogar", label: "Volver a Hogar" }}
        action={<InfoHelp content={NUEVO_HOGAR_HELP} size="icon" />}
        className="mb-0"
      />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hh-name">Nombre del hogar</Label>
          <Input
            id="hh-name"
            placeholder="Casa, Familia, Depto…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={busy}
            aria-invalid={!!err}
          />
        </div>
        {err && (
          <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
            {err}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Creando…" : "Crear hogar"}
        </Button>
      </form>
    </div>
  );
}
