"use client";

import { useState } from "react";
import { Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuGroup, MenuItem } from "@/components/ui/menu-list";
import { patchMe } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";
import type { User } from "@/lib/api/schemas";
import { useAuthStore } from "@/stores/auth";

/**
 * "Perfil" in Ajustes (plan 1.10b, the grouped list): name and email as
 * rows; each opens the sheet to edit them.
 */
export function ProfileConfig() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <>
      <MenuGroup
        title="Perfil"
        footer={
          user.pendingEmail ? (
            <>
              Cambio pendiente a <span className="font-semibold text-ink">{user.pendingEmail}</span>: confirmalo con el link que
              te mandamos a esa casilla.
            </>
          ) : undefined
        }
      >
        <MenuItem icon={UserIcon} label="Nombre" detail={`${user.firstName} ${user.lastName}`.trim()} onClick={() => setOpen(true)} />
        <MenuItem icon={Mail} label="Email" detail={user.email} onClick={() => setOpen(true)} />
      </MenuGroup>
      {open && <ProfileSheet user={user} onOpenChange={setOpen} />}
    </>
  );
}

function ProfileSheet({ user, onOpenChange }: { user: User; onOpenChange: (v: boolean) => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = firstName.trim() !== user.firstName || lastName.trim() !== user.lastName || email.trim() !== user.email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setErrors({});
    try {
      const input: Record<string, string> = {};
      if (firstName.trim() !== user.firstName) input.firstName = firstName.trim();
      if (lastName.trim() !== user.lastName) input.lastName = lastName.trim();
      if (email.trim() !== user.email) input.email = email.trim();
      const updated = await patchMe(input);
      setUser(updated);
      if (input.email && updated.pendingEmail) {
        toast.success("Revisá tu nuevo email", {
          description: `Te mandamos un link a ${updated.pendingEmail}. El cambio se aplica cuando lo confirmes.`,
        });
      } else {
        toast.success("Perfil actualizado");
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "conflict") setErrors({ email: "Ese email ya está en uso" });
      else if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else toastError(err);
      setBusy(false);
    }
  }

  const field = (id: string, label: string, value: string, set: (v: string) => void, key: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        disabled={busy}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${id}-error` : undefined}
      />
      {errors[key] && (
        <p id={`${id}-error`} className="text-caption text-negative">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tu perfil</DialogTitle>
          <DialogDescription>Si cambiás el email, te mandamos un link para confirmarlo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {field("profile-first-name", "Nombre", firstName, setFirstName, "firstName")}
            {field("profile-last-name", "Apellido", lastName, setLastName, "lastName")}
          </div>
          {field("profile-email", "Email", email, setEmail, "email", "email")}
          <Button type="submit" size="lg" className="w-full" disabled={!dirty || busy}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
