import { AppShell } from "@/components/app-shell";
import { SplitRulesCard } from "@/components/split-rules-card";
import { BanksConfig } from "@/components/banks-config";
import { PaymentMethodsConfig } from "@/components/payment-methods-config";
import { HouseholdConfig } from "@/components/household-config";
import { ProfileConfig } from "@/components/profile-config";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const AJUSTES_HELP: InfoHelpContent = {
  titulo: "Ajustes",
  acciones: [
    "Editá tu perfil: nombre, apellido y email de la cuenta.",
    "Configurá el hogar (nombre y moneda base) e invitá, transferí o quitá miembros.",
    "Ajustá las reglas de división (porcentaje por miembro) para los gastos compartidos.",
    "Administrá bancos y medios de pago, incluyendo cierres y vencimientos de tarjetas de crédito.",
    "Creá otro hogar o, desde la zona de peligro, eliminá el hogar o salí de él.",
  ],
  consideraciones: [
    "El nombre y la moneda base del hogar, las reglas de división y la gestión de miembros solo los edita el dueño; el resto los ve como solo lectura.",
    "La moneda base define a qué moneda se convierten todos los montos en los reportes.",
    "Las reglas de división deben sumar 100%.",
    "Desactivar un medio de pago lo oculta al cargar gastos, pero podés reactivarlo («Revivir») y su historial se mantiene.",
    "Eliminar el hogar es un borrado lógico que saca a todos los miembros: te pide escribir el nombre exacto para confirmar.",
  ],
  relacionado: [
    { label: "Crear nuevo hogar", href: "/ajustes/hogares/nuevo" },
    { label: "Categorías", href: "/categorias" },
    { label: "Movimientos", href: "/movimientos" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
          <InfoHelp content={AJUSTES_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Preferencias del hogar y del usuario.</p>
      </div>
      <div className="flex flex-col gap-4">
        <ProfileConfig />
        <HouseholdConfig />
        <SplitRulesCard />
        <BanksConfig />
        <PaymentMethodsConfig />
      </div>
    </AppShell>
  );
}
