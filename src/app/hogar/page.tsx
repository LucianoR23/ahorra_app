import { AppShell } from "@/components/app-shell";
import { HogarSettings } from "@/components/hogar-settings";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const HOGAR_HELP: InfoHelpContent = {
  titulo: "Hogar",
  acciones: [
    "Configurá el hogar (nombre y moneda base) e invitá, transferí o quitá miembros.",
    "Ajustá las reglas de división (porcentaje por miembro) para los gastos compartidos.",
    "Si todavía no compartís gastos, creá un hogar; desde la zona de peligro podés eliminarlo o salir de él.",
  ],
  consideraciones: [
    "El nombre y la moneda base del hogar, las reglas de división y la gestión de miembros solo los edita el dueño; el resto los ve como solo lectura.",
    "Las reglas de división deben sumar 100%.",
    "Mi plata es solo tuya: no se comparte ni se borra. Para compartir gastos usás el hogar, y podés estar en uno solo.",
    "Eliminar el hogar es un borrado lógico que saca a todos los miembros: te pide escribir el nombre exacto para confirmar.",
  ],
  relacionado: [{ label: "Cuentas entre ustedes", href: "/deudas" }],
};

export default function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Hogar"
        description="Los gastos que compartís y con quién."
        action={<InfoHelp content={HOGAR_HELP} size="icon" />}
      />
      <HogarSettings />
    </AppShell>
  );
}
