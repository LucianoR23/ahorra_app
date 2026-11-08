import { AppShell } from "@/components/app-shell";
import { ActivityCard } from "@/components/activity-card";
import { ChangePasswordCard } from "@/components/change-password-card";
import { DevicesCard } from "@/components/devices-card";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { PrivacyCard } from "@/components/privacy-card";
import { SignOutEverywhereCard } from "@/components/sign-out-everywhere-card";

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Seguridad</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contraseña, privacidad, dispositivos conectados, actividad y cuenta.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <ChangePasswordCard />
        <PrivacyCard />
        <DevicesCard />
        <SignOutEverywhereCard />
        <ActivityCard />
        <DeleteAccountCard />
      </div>
    </AppShell>
  );
}
