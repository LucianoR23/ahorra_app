import { AppShell } from "@/components/app-shell";
import { AppearanceCard } from "@/components/appearance-card";
import { ProfileConfig } from "@/components/profile-config";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const AJUSTES_HELP: InfoHelpContent = {
  titulo: "Ajustes",
  acciones: [
    "Editá tu perfil: nombre, apellido y email de la cuenta.",
    "Elegí el tema: por defecto sigue el de tu dispositivo.",
  ],
  consideraciones: [
    "Las tarjetas y medios de pago están en Tarjetas; el hogar y sus miembros, en Hogar.",
  ],
  relacionado: [
    { label: "Tarjetas", href: "/tarjetas" },
    { label: "Hogar", href: "/hogar" },
    { label: "Seguridad y privacidad", href: "/seguridad" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Ajustes"
        description="Tu perfil y cómo se ve la app."
        back={{ href: "/mas", label: "Volver a Más" }}
        action={<InfoHelp content={AJUSTES_HELP} size="icon" />}
      />
      <div className="flex flex-col gap-4">
        <ProfileConfig />
        <AppearanceCard />
      </div>
    </AppShell>
  );
}
