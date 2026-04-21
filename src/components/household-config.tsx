"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Copy,
  Info,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useHouseholds,
  useHouseholdMembers,
  useHouseholdInvites,
} from "@/lib/api/hooks";
import {
  patchHousehold,
  deleteHousehold,
  createHouseholdInvite,
  removeHouseholdMember,
  transferHouseholdOwnership,
  revokeHouseholdInvite,
  resendHouseholdInvite,
  type CreateInviteResponse,
} from "@/lib/api/mutations";
import type { Currency } from "@/lib/api/schemas";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

function invalidateHouseholds() {
  swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/households"),
    undefined,
    { revalidate: true },
  );
}

export function HouseholdConfig() {
  const me = useAuthStore((s) => s.user);
  const currentHhId = useHouseholdStore((s) => s.currentId);
  const setCurrentId = useHouseholdStore((s) => s.setCurrentId);
  const router = useRouter();

  const { data: households, isLoading } = useHouseholds();
  const { data: members } = useHouseholdMembers(currentHhId);
  const { data: invites } = useHouseholdInvites(currentHhId);

  const household = households?.find((h) => h.id === currentHhId);
  const isOwner = !!(me && household && household.createdBy === me.id);

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [editKey, setEditKey] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  if (household && editKey !== household) {
    setEditKey(household);
    setName(household.name);
    setCurrency(household.baseCurrency as Currency);
  }

  const dirty = household
    ? name !== household.name || currency !== household.baseCurrency
    : false;

  async function handleSave() {
    if (!household || !dirty) return;
    setSaving(true);
    setSaveErr(null);
    setSaveOk(false);
    try {
      await patchHousehold(household.id, { name: name.trim(), baseCurrency: currency });
      invalidateHouseholds();
      setSaveOk(true);
      toast.success("Hogar actualizado");
    } catch (e) {
      setSaveErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    if (!household) return;
    try {
      await deleteHousehold(household.id);
      const next = households?.find((h) => h.id !== household.id) ?? null;
      setCurrentId(next?.id ?? null);
      invalidateHouseholds();
      swrMutate(() => true, undefined, { revalidate: true });
      toast.success("Hogar eliminado");
      router.replace(next ? "/ajustes" : "/");
    } catch (e) {
      toastError(e, "No se pudo eliminar el hogar");
    }
  }

  async function performLeave() {
    if (!household || !me) return;
    try {
      await removeHouseholdMember(household.id, me.id);
      const next = households?.find((h) => h.id !== household.id) ?? null;
      setCurrentId(next?.id ?? null);
      invalidateHouseholds();
      swrMutate(() => true, undefined, { revalidate: true });
      toast.success("Saliste del hogar");
      router.replace(next ? "/ajustes" : "/");
    } catch (e) {
      toastError(e, "No se pudo salir del hogar");
    }
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!household) return null;

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Configuración del hogar</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Nombre, moneda base y miembros.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <Info className="size-3" /> Solo lectura
              </span>
            )}
            <Link href="/ajustes/hogares/nuevo">
              <Button variant="outline" size="xs" className="gap-1">
                <Plus className="size-3" /> Nuevo hogar
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <Label htmlFor="hh-name">Nombre del hogar</Label>
            <Input
              id="hh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner || saving}
            />
          </div>
          <div>
            <Label>Moneda base</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)} disabled={!isOwner || saving}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isOwner && (
            <>
              {saveErr && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveErr}</div>
              )}
              <div className="flex items-center justify-between">
                {saveOk && !dirty && <span className="text-[11px] text-emerald-500">Guardado</span>}
                <div className="ml-auto">
                  <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
                    {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Save className="mr-1 size-3.5" />}
                    Guardar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold">Miembros</span>
            {isOwner && <InviteDialog householdId={household.id} onDone={invalidateHouseholds} />}
          </div>
          <div className="flex flex-col gap-1.5">
            {members?.map((m) => (
              <div key={m.userId} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold uppercase">
                  {m.firstName[0]}{m.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    {m.userId === me?.id ? "Yo" : `${m.firstName} ${m.lastName}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                  {m.role === "owner" ? "Dueño" : "Miembro"}
                </Badge>
                {isOwner && m.userId !== me?.id && (
                  <>
                    <TransferOwnershipButton
                      householdId={household.id}
                      userId={m.userId}
                      name={`${m.firstName} ${m.lastName}`}
                      onDone={invalidateHouseholds}
                    />
                    <RemoveMemberButton
                      householdId={household.id}
                      userId={m.userId}
                      name={`${m.firstName} ${m.lastName}`}
                      onDone={invalidateHouseholds}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {isOwner && invites && invites.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">Invitaciones pendientes</span>
              <span className="text-[10px] text-muted-foreground">{invites.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {invites.map((inv) => (
                <InviteRow
                  key={inv.id}
                  invite={inv}
                  onDone={invalidateHouseholds}
                />
              ))}
            </div>
          </div>
        )}

        {isOwner ? (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-2 text-[11px] font-semibold text-destructive">Zona de peligro</p>
            <DeleteHouseholdDialog
              householdName={household.name}
              onConfirm={performDelete}
            />
          </div>
        ) : (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-2 text-[11px] font-semibold text-destructive">Zona de peligro</p>
            <LeaveHouseholdDialog
              householdName={household.name}
              onConfirm={performLeave}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InviteDialog({ householdId, onDone }: { householdId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setErr(null);
    setResult(null);
    setSaving(true);
    try {
      const res = await createHouseholdInvite(householdId, email.trim());
      onDone();
      setResult(res);
      setEmail("");
      if (res.emailSent) {
        toast.success("Invitación enviada", {
          description: `Se mandó un mail a ${res.invite.email}.`,
        });
      } else {
        toast.info("Invitación creada", {
          description: "No se pudo enviar el mail. Compartí el link manualmente.",
        });
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr("No se pudo invitar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.acceptUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setErr(null);
          setResult(null);
          setEmail("");
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserPlus className="mr-1 size-3.5" />
        Invitar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
        </DialogHeader>
        {!result ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="invite-email">Email del usuario</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Le vamos a mandar un mail con un link para unirse. Si aún no tiene cuenta, podrá
                registrarse con ese link.
              </p>
            </div>
            {err && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {err}
              </div>
            )}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>Cerrar</DialogClose>
              <Button type="submit" disabled={!email.trim() || saving}>
                {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                Enviar invitación
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
              ¡Invitación creada para <span className="font-bold">{result.invite.email}</span>!
            </div>
            <div>
              <Label>Link de invitación</Label>
              <div className="flex gap-2">
                <Input value={result.acceptUrl} readOnly className="font-mono text-[10px]" />
                <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Podés compartirlo manualmente si prefieren no esperar el mail. Expira en 7 días.
              </p>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" />}>Listo</DialogClose>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteRow({
  invite,
  onDone,
}: {
  invite: { id: string; email: string; expiresAt: string };
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<"resend" | "revoke" | null>(null);

  async function handleResend() {
    setBusy("resend");
    try {
      const res = await resendHouseholdInvite(invite.id);
      onDone();
      if (res.emailSent) {
        toast.success("Invitación reenviada");
      } else {
        toast.info("Invitación rotada", {
          description: "No se pudo mandar el mail. Compartí el link manualmente.",
        });
      }
    } catch (e) {
      toastError(e, "No se pudo reenviar");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke() {
    if (!confirm(`¿Cancelar la invitación a ${invite.email}?`)) return;
    setBusy("revoke");
    try {
      await revokeHouseholdInvite(invite.id);
      onDone();
      toast.success("Invitación cancelada");
    } catch (e) {
      toastError(e, "No se pudo cancelar");
    } finally {
      setBusy(null);
    }
  }

  const expiresAt = new Date(invite.expiresAt);
  const expiresLabel = expiresAt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <Mail className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{invite.email}</p>
        <p className="text-[10px] text-muted-foreground">Expira el {expiresLabel}</p>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={busy !== null}
        aria-label="Reenviar invitación"
        className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {busy === "resend" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={handleRevoke}
        disabled={busy !== null}
        aria-label="Cancelar invitación"
        className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        {busy === "revoke" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" />
        )}
      </button>
    </div>
  );
}

function TransferOwnershipButton({
  householdId,
  userId,
  name,
  onDone,
}: {
  householdId: string;
  userId: string;
  name: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await transferHouseholdOwnership(householdId, userId);
      onDone();
      toast.success(`Transferiste la propiedad a ${name}`);
      setOpen(false);
    } catch (e) {
      toastError(e, "No se pudo transferir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Transferir propiedad"
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          />
        }
      >
        <Crown className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir propiedad del hogar</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Vas a dejar de ser el dueño. <span className="font-semibold text-foreground">{name}</span>{" "}
          pasará a ser el owner del hogar y vos quedás como miembro. Esta acción no se puede
          deshacer por tu cuenta — necesitarías que el nuevo owner te transfiera de vuelta.
        </p>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button type="button" onClick={handle} disabled={busy}>
            {busy && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Transferir propiedad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveMemberButton({
  householdId,
  userId,
  name,
  onDone,
}: {
  householdId: string;
  userId: string;
  name: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await removeHouseholdMember(householdId, userId);
      onDone();
      toast.success(`${name} fue removido del hogar`);
      setOpen(false);
    } catch (e) {
      toastError(e, "No se pudo remover");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Remover a ${name}`}
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <UserX className="size-3.5" />}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive">¿Remover miembro?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Vas a sacar a <span className="font-semibold text-foreground">{name}</span> del hogar.
          Pierde acceso inmediato. Su historial (gastos, pagos, shares) queda intacto en DB.
        </p>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button type="button" variant="destructive" onClick={handle} disabled={busy}>
            {busy && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteHouseholdDialog({
  householdName,
  onConfirm,
}: {
  householdName: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = typed.trim() === householdName;

  async function handle() {
    if (!matches) return;
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTyped("");
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="mr-1 size-3.5" />
        Eliminar hogar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">¿Eliminar el hogar?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            Todos los miembros (incluyéndote) pierden acceso inmediato. El hogar queda
            soft-deleted — la data se conserva y un superadmin podría restaurarlo. Si querés un
            borrado físico, pedile al admin que lo purgue.
          </p>
          <div>
            <Label htmlFor="delete-hh-confirm">
              Escribí el nombre del hogar para confirmar:{" "}
              <span className="font-bold text-destructive">{householdName}</span>
            </Label>
            <Input
              id="delete-hh-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={householdName}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handle}
            disabled={busy || !matches}
          >
            {busy && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Eliminar hogar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveHouseholdDialog({
  householdName,
  onConfirm,
}: {
  householdName: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <LogOut className="mr-1 size-3.5" />
        Salir del hogar
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Salir del hogar?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Vas a dejar el hogar{" "}
          <span className="font-semibold text-foreground">{householdName}</span>. Perdés acceso a
          sus gastos, objetivos y balances hasta que te vuelvan a invitar.
        </p>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button type="button" variant="destructive" onClick={handle} disabled={busy}>
            {busy && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Salir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
