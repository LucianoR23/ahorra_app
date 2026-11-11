"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuGroup, MenuItem, MenuRow } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";
import { adminDeleteWaitlistEmail, adminExportWaitlist } from "@/lib/api/mutations";
import { confirm } from "@/lib/confirm";
import { saveFile } from "@/lib/download";
import { toast, toastError } from "@/lib/toast";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Landing waitlist (plan 1.11, endpoints from B.5): download the confirmed
 * entries and erase an address when someone asks (Ley 25.326). The API
 * writes both to the audit log, the erased address excluded.
 */
export function AdminWaitlist() {
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [email, setEmail] = useState("");
  const valid = EMAIL.test(email.trim());

  async function exportCsv() {
    setBusy("export");
    try {
      const blob = await adminExportWaitlist();
      saveFile(blob, `lista-de-espera-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      toastError(e, "No se pudo descargar");
    } finally {
      setBusy(null);
    }
  }

  async function erase(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) return;
    const ok = await confirm({
      title: "¿Borrar este email de la lista?",
      description: `${address} sale de la lista de espera. No se puede deshacer.`,
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await adminDeleteWaitlistEmail(address);
      // The API answers the same whether the address was there or not.
      toast.success("Listo: si estaba en la lista, ya no está.");
      setEmail("");
    } catch (err) {
      toastError(err, "No se pudo borrar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Lista de espera" description="Los emails que se anotaron desde la landing." className="mb-0" />
      <MenuGroup title="Exportar" footer="Solo los emails confirmados. La descarga queda en Auditoría.">
        <MenuItem
          icon={busy === "export" ? Loader2 : Download}
          label="Descargar CSV"
          onClick={busy ? undefined : exportCsv}
        />
      </MenuGroup>
      <MenuGroup
        title="Pedido de baja"
        footer="Por la Ley 25.326 hay 5 días hábiles para borrarlo. Queda en Auditoría, sin el email."
      >
        <MenuRow>
          <form onSubmit={erase} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="waitlist-email">Email</Label>
              <Input
                id="waitlist-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy !== null}
              />
            </div>
            <Button type="submit" variant="destructive" disabled={busy !== null || !valid}>
              {busy === "delete" && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Borrar de la lista
            </Button>
          </form>
        </MenuRow>
      </MenuGroup>
    </div>
  );
}
