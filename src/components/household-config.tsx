"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { useRouter } from "next/navigation";
import { Coins, Copy, Home, LogOut, Mail, MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuGroup, MenuItem, MenuRow } from "@/components/ui/menu-list";
import { FxSourceSetting } from "@/components/fx-source-setting";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useHouseholdInvites, useHouseholdMembers, useHouseholds } from "@/lib/api/hooks";
import {
  createHouseholdInvite,
  deleteHousehold,
  patchHousehold,
  removeHouseholdMember,
  resendHouseholdInvite,
  revokeHouseholdInvite,
  transferHouseholdOwnership,
  type CreateInviteResponse,
} from "@/lib/api/mutations";
import type { Currency, Household } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { confirm } from "@/lib/confirm";
import { toast, toastError } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

const CURRENCIES = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
] as const;

function invalidateHouseholds() {
  swrMutate((k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/households"), undefined, { revalidate: true });
}

const initials = (m: { firstName: string; lastName: string }) => `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();

/**
 * The hogar's settings (plan 1.10b, no design: the grouped list of `Mas`).
 * The owner edits; the others see the same rows read-only. `children`
 * (the split rules) go before leaving or deleting, which is always last.
 */
export function HouseholdConfig({ householdId, children }: { householdId: string; children?: React.ReactNode }) {
  const me = useAuthStore((s) => s.user);
  const setCurrentId = useHouseholdStore((s) => s.setCurrentId);
  const router = useRouter();
  const { data: households, isLoading } = useHouseholds();
  const { data: members } = useHouseholdMembers(householdId);
  const { data: invites } = useHouseholdInvites(householdId);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const household = households?.find((h) => h.id === householdId);
  const isOwner = !!(me && household && household.createdBy === me.id);

  function backToMiPlata() {
    const personal = households?.find((h) => h.kind === "personal") ?? null;
    setCurrentId(personal?.id ?? null);
    invalidateHouseholds();
    swrMutate(() => true, undefined, { revalidate: true });
    router.replace("/");
  }

  async function handleLeave() {
    if (!household || !me) return;
    const ok = await confirm({
      title: "¿Salir del hogar?",
      description: `Dejás de ver los gastos, objetivos y cuentas de ${household.name} hasta que te vuelvan a invitar.`,
      confirmLabel: "Salir",
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeHouseholdMember(household.id, me.id);
      toast.success("Saliste del hogar");
      backToMiPlata();
    } catch (e) {
      toastError(e, "No se pudo salir del hogar");
    }
  }

  async function handleTransfer(userId: string, name: string) {
    if (!household) return;
    const ok = await confirm({
      title: `¿Hacer dueño a ${name}?`,
      description: "Vos quedás como miembro. Para volver a ser dueño, te lo tiene que pasar de vuelta.",
      confirmLabel: "Hacer dueño",
    });
    if (!ok) return;
    try {
      await transferHouseholdOwnership(household.id, userId);
      invalidateHouseholds();
      toast.success(`${name} es el nuevo dueño`);
    } catch (e) {
      toastError(e, "No se pudo pasar la propiedad");
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!household) return;
    const ok = await confirm({
      title: `¿Sacar a ${name} del hogar?`,
      description: "Pierde el acceso ya. Lo que cargó queda en el historial.",
      confirmLabel: "Sacar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeHouseholdMember(household.id, userId);
      invalidateHouseholds();
      toast.success(`${name} ya no está en el hogar`);
    } catch (e) {
      toastError(e, "No se pudo sacar");
    }
  }

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!household) return null;

  return (
    <>
      <MenuGroup title="Hogar" footer={isOwner ? undefined : "Solo el dueño puede cambiarlo."}>
        {isOwner ? (
          <>
            <MenuItem icon={Home} label="Nombre" detail={household.name} onClick={() => setEditing(true)} />
            <MenuItem icon={Coins} label="Moneda base" detail={household.baseCurrency} onClick={() => setEditing(true)} />
          </>
        ) : (
          <>
            <ReadRow icon={Home} label="Nombre" value={household.name} />
            <ReadRow icon={Coins} label="Moneda base" value={household.baseCurrency} />
          </>
        )}
      </MenuGroup>

      <FxSourceSetting household={household} editable={isOwner} title="Cotización del hogar" />

      <MenuGroup title={members ? `Miembros · ${members.length}` : "Miembros"}>
        {members?.map((m) => {
          const name = `${m.firstName} ${m.lastName}`.trim();
          const isMe = m.userId === me?.id;
          return (
            <MenuRow key={m.userId}>
              <Avatar className="size-10">
                <AvatarFallback className={isMe ? "bg-primary text-caption font-semibold text-primary-foreground" : "bg-brand text-caption font-semibold text-ink"}>
                  {initials(m)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate">{isMe ? `${name} (vos)` : name}</span>
                  {m.role === "owner" && <Badge variant="secondary">Dueño</Badge>}
                </p>
                <p className="truncate text-caption text-ink-muted">{m.email}</p>
              </div>
              {isOwner && !isMe && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Opciones de ${name}`} />}>
                    <MoreHorizontal aria-hidden strokeWidth={1.75} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void handleTransfer(m.userId, name)}>Hacer dueño</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => void handleRemove(m.userId, name)}>
                      Sacar del hogar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </MenuRow>
          );
        })}
        {isOwner && <MenuItem icon={UserPlus} label="Invitar a alguien" onClick={() => setInviting(true)} />}
      </MenuGroup>

      {isOwner && invites && invites.length > 0 && (
        <MenuGroup title="Invitaciones pendientes">
          {invites.map((inv) => (
            <InviteRow key={inv.id} invite={inv} />
          ))}
        </MenuGroup>
      )}

      {editing && <HouseholdSheet household={household} onOpenChange={setEditing} />}
      {inviting && <InviteSheet householdId={household.id} onOpenChange={setInviting} />}
      {deleting && (
        <DeleteHouseholdSheet
          household={household}
          onOpenChange={setDeleting}
          onDeleted={() => {
            toast.success("Hogar eliminado");
            backToMiPlata();
          }}
        />
      )}

      {children}

      <MenuGroup>
        {isOwner ? (
          <MenuItem icon={Trash2} label="Eliminar hogar" tone="destructive" onClick={() => setDeleting(true)} />
        ) : (
          <MenuItem icon={LogOut} label="Salir del hogar" tone="destructive" onClick={() => void handleLeave()} />
        )}
      </MenuGroup>
    </>
  );
}

function ReadRow({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) {
  return (
    <MenuRow>
      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      <span className="shrink-0 grow">{label}</span>
      <span className="min-w-0 truncate text-caption text-ink-muted">{value}</span>
    </MenuRow>
  );
}

function HouseholdSheet({ household, onOpenChange }: { household: Household; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState(household.name);
  const [currency, setCurrency] = useState<Currency>(household.baseCurrency as Currency);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = name.trim() !== household.name || currency !== household.baseCurrency;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || !name.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await patchHousehold(household.id, { name: name.trim(), baseCurrency: currency });
      invalidateHouseholds();
      toast.success("Hogar actualizado");
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>El hogar</DialogTitle>
          <DialogDescription>Los reportes del hogar se muestran en la moneda base.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hh-name">Nombre del hogar</Label>
            <Input id="hh-name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label id="hh-currency">Moneda base</Label>
            <Segmented aria-labelledby="hh-currency" value={currency} onValueChange={setCurrency} options={CURRENCIES} />
          </div>
          {err && (
            <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
              {err}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={!dirty || !name.trim() || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteSheet({ householdId, onOpenChange }: { householdId: string; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setErr(null);
    setSaving(true);
    try {
      const res = await createHouseholdInvite(householdId, email.trim());
      invalidateHouseholds();
      setResult(res);
      if (res.emailSent) toast.success("Invitación enviada", { description: `Le mandamos un mail a ${res.invite.email}.` });
      else toast.info("Invitación creada", { description: "No se pudo mandar el mail. Compartí el link." });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo invitar");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.acceptUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar al hogar</DialogTitle>
          <DialogDescription>
            {result
              ? `La invitación a ${result.invite.email} vence en 7 días.`
              : "Le mandamos un mail con un link para sumarse. Si no tiene cuenta, se registra con ese link."}
          </DialogDescription>
        </DialogHeader>
        {!result ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@mail.com"
                autoFocus
              />
            </div>
            {err && (
              <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
                {err}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={!email.trim() || saving}>
              {saving ? "Enviando…" : "Enviar invitación"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-link">Link de invitación</Label>
              <div className="flex gap-2">
                <Input id="invite-link" value={result.acceptUrl} readOnly className="font-mono text-caption" />
                <Button type="button" variant="secondary" size="icon" aria-label="Copiar link" onClick={handleCopy}>
                  <Copy aria-hidden strokeWidth={1.75} />
                </Button>
              </div>
              <p className="text-caption text-ink-muted">Si no quieren esperar el mail, compartilo por donde quieras.</p>
            </div>
            <Button type="button" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteRow({ invite }: { invite: { id: string; email: string; expiresAt: string } }) {
  const [busy, setBusy] = useState(false);
  const expires = new Date(invite.expiresAt).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  async function handleResend() {
    setBusy(true);
    try {
      const res = await resendHouseholdInvite(invite.id);
      invalidateHouseholds();
      if (res.emailSent) toast.success("Invitación reenviada");
      else toast.info("Invitación renovada", { description: "No se pudo mandar el mail. Compartí el link." });
    } catch (e) {
      toastError(e, "No se pudo reenviar");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    const ok = await confirm({
      title: "¿Cancelar la invitación?",
      description: `El link que le mandamos a ${invite.email} deja de andar.`,
      confirmLabel: "Cancelar invitación",
      cancelLabel: "Volver",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await revokeHouseholdInvite(invite.id);
      invalidateHouseholds();
      toast.success("Invitación cancelada");
    } catch (e) {
      toastError(e, "No se pudo cancelar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MenuRow>
      <Mail aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="truncate">{invite.email}</p>
        <p className="text-caption text-ink-muted">Vence el {expires}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Opciones de la invitación a ${invite.email}`} disabled={busy} />}>
          <MoreHorizontal aria-hidden strokeWidth={1.75} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void handleResend()}>Reenviar</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => void handleRevoke()}>
            Cancelar invitación
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </MenuRow>
  );
}

function DeleteHouseholdSheet({
  household,
  onOpenChange,
  onDeleted,
}: {
  household: Household;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = typed.trim() === household.name;

  async function handle() {
    if (!matches) return;
    setBusy(true);
    try {
      await deleteHousehold(household.id);
      onOpenChange(false);
      onDeleted();
    } catch (e) {
      toastError(e, "No se pudo eliminar el hogar");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Eliminar el hogar?</DialogTitle>
          <DialogDescription>
            Todos, también vos, pierden el acceso ya. Los datos se guardan y soporte los puede recuperar si hace falta.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="delete-hh-confirm">
            Escribí <span className="font-bold text-negative">{household.name}</span> para confirmar
          </Label>
          <Input
            id="delete-hh-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <Button type="button" variant="destructive" size="lg" className="w-full" onClick={handle} disabled={busy || !matches}>
          {busy ? "Eliminando…" : "Eliminar hogar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
