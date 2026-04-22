"use client";

import { useState } from "react";
import { Loader2, Save, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patchMe } from "@/lib/api/mutations";
import { useAuthStore } from "@/stores/auth";
import { ApiError } from "@/lib/api/errors";
import { toast, toastError } from "@/lib/toast";

type Draft = { firstName?: string; lastName?: string; email?: string };

export function ProfileConfig() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const firstName = draft.firstName ?? user.firstName;
  const lastName = draft.lastName ?? user.lastName;
  const email = draft.email ?? user.email;

  const dirty =
    firstName.trim() !== user.firstName ||
    lastName.trim() !== user.lastName ||
    email.trim() !== user.email;

  async function handleSave() {
    if (!user || !dirty) return;
    setBusy(true);
    setErrors({});
    try {
      const input: Record<string, string> = {};
      if (firstName.trim() !== user.firstName) input.firstName = firstName.trim();
      if (lastName.trim() !== user.lastName) input.lastName = lastName.trim();
      if (email.trim() !== user.email) input.email = email.trim();
      const updated = await patchMe(input);
      setUser(updated);
      setDraft({});
      toast.success("Perfil actualizado");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "conflict") {
          setErrors({ email: "Ese email ya está en uso" });
        } else if (err.field) {
          setErrors({ [err.field]: err.message });
        } else {
          toastError(err);
        }
      } else {
        toastError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <UserIcon className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Mi perfil</h2>
            <p className="text-[12px] text-muted-foreground">
              Nombre, apellido y email de tu cuenta.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="profile-first-name">Nombre</Label>
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                disabled={busy}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="profile-last-name">Apellido</Label>
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                disabled={busy}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              disabled={busy}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!dirty || busy}>
              {busy ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Save className="mr-1 size-3.5" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
