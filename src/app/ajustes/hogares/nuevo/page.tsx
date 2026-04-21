"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { ArrowLeft, ArrowRight, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AuthGate } from "@/components/auth-gate";
import { createHousehold } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { useHouseholdStore } from "@/stores/household";
import type { Currency } from "@/lib/api/schemas";

export default function Page() {
  return (
    <AuthGate>
      <NewHouseholdInner />
    </AuthGate>
  );
}

function NewHouseholdInner() {
  const router = useRouter();
  const setCurrentId = useHouseholdStore((s) => s.setCurrentId);

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
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
      const hh = await createHousehold({ name: trimmed, baseCurrency: currency });
      setCurrentId(hh.id);
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/households"),
        undefined,
        { revalidate: true },
      );
      // Drop household-scoped caches so the switch to the new hogar reflects empty state.
      swrMutate(() => true, undefined, { revalidate: true });
      toast.success(`Hogar "${hh.name}" creado`);
      router.replace("/ajustes");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo crear el hogar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Link
        href="/ajustes"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Volver a Ajustes
      </Link>

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Home className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Crear nuevo hogar</h1>
            <p className="text-sm text-muted-foreground">
              Vas a ser el dueño del hogar. Podés invitar miembros después.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {err && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Creando…
              </>
            ) : (
              <>
                Crear hogar <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
