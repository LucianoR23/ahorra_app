import { AppShell } from "@/components/app-shell";
import { HogarSettings } from "@/components/hogar-settings";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const HOGAR_HELP: InfoHelpContent = {
  titulo: "Hogar",
  acciones: [
    "Tocá el nombre o la moneda para cambiarlos; invitá gente con «Invitar a alguien».",
    "Con el menú de cada miembro lo hacés dueño o lo sacás del hogar.",
    "Cambiá cuánto le toca a cada uno en «Cómo se dividen los gastos». Al final podés salir del hogar, o eliminarlo si sos el dueño.",
  ],
  consideraciones: [
    "El nombre y la moneda base del hogar, las reglas de división y la gestión de miembros solo los edita el dueño; el resto los ve como solo lectura.",
    "Las reglas de división deben sumar 100%.",
    "Mi plata es solo tuya: no se comparte ni se borra. Para compartir gastos usás el hogar, y podés estar en uno solo.",
    "Eliminar el hogar saca a todos los miembros y te pide escribir su nombre para confirmar. Soporte lo puede recuperar.",
  ],
  relacionado: [{ label: "Cuentas entre ustedes", href: "/deudas" }],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-4">
        <PageHeader
          title="Hogar y miembros"
          description="Los gastos que compartís y con quién."
          back={{ href: "/mas", label: "Volver a Más" }}
          action={<InfoHelp content={HOGAR_HELP} size="icon" />}
          className="mb-0"
        />
        <HogarSettings />
      </div>
    </AppShell>
  );
}
