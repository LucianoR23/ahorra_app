import { AppShell } from "@/components/app-shell";
import { IncomeForm } from "@/components/income-form";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const NUEVO_INGRESO_HELP: InfoHelpContent = {
  titulo: "Nuevo ingreso",
  acciones: [
    "Cargá el monto y la moneda (con conversión estimada si no es tu moneda base).",
    "Elegí la fuente (sueldo, freelance, regalo…) o escribí una propia.",
    "Indicá la fecha, para quién es y, opcionalmente, la cuenta destino.",
    "Creá el ingreso con «Crear ingreso»: te lleva a su detalle.",
  ],
  consideraciones: [
    "Solo el monto (mayor a 0), la fuente y la fecha son obligatorios.",
    "Si recibís en otra moneda, la conversión es estimada: la tasa exacta se congela al crear.",
    "«Para» sos vos por defecto; solo aparecen otros destinatarios si tu hogar tiene más miembros.",
    "Para ingresos que se repiten todos los meses, mejor cargá un ingreso fijo en Recurrentes.",
  ],
  relacionado: [
    { label: "Ingresos", href: "/ingresos" },
    { label: "Recurrentes", href: "/recurrentes" },
    { label: "Ajustes (cuentas)", href: "/ajustes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Nuevo ingreso</h1>
          <InfoHelp content={NUEVO_INGRESO_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Registrá un ingreso puntual.</p>
      </div>
      <IncomeForm />
    </AppShell>
  );
}
