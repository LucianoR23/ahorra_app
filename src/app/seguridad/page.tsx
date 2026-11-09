import { AppShell } from "@/components/app-shell";
import { ActivityCard } from "@/components/activity-card";
import { ChangePasswordItem } from "@/components/change-password-card";
import { DeleteAccountItem } from "@/components/delete-account-card";
import { DevicesCard } from "@/components/devices-card";
import { PrivacyCard } from "@/components/privacy-card";
import { SignOutEverywhereItem } from "@/components/sign-out-everywhere-card";
import { MenuGroup } from "@/components/ui/menu-list";
import { PageHeader } from "@/components/ui/page-header";

/** Seguridad y privacidad (plan 1.10b, no design: the grouped list of `Mas`). */
export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-4">
        <PageHeader
          title="Seguridad y privacidad"
          description="Tu contraseña, tus sesiones y lo que se ve en este dispositivo."
          back={{ href: "/mas", label: "Volver a Más" }}
          className="mb-0"
        />
        <MenuGroup title="Acceso" footer="Si perdiste un dispositivo o entraste en uno que no es tuyo, cerrá todas las sesiones.">
          <ChangePasswordItem />
          <SignOutEverywhereItem />
        </MenuGroup>
        <PrivacyCard />
        <DevicesCard />
        <ActivityCard />
        <MenuGroup title="Cuenta">
          <DeleteAccountItem />
        </MenuGroup>
      </div>
    </AppShell>
  );
}
