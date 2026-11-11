import { AppShell } from "@/components/app-shell";
import { IncomeForm } from "@/components/income-form";
import { CloseButton } from "@/components/close-button";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";
import { PageHeader } from "@/components/ui/page-header";

const NUEVO_INGRESO_HELP: InfoHelpContent = {
  titulo: "Nuevo ingreso",
  acciones: [
    "Escribí el monto arriba y elegí la moneda (si no es en pesos, ves cuánto es en pesos).",
    "Elegí la fuente (salario, freelance, regalo…) o «Otro» para escribir una propia.",
    "Indicá la fecha, quién lo recibió (si son varios en el hogar) y, si querés, la cuenta donde entró.",
    "Guardalo con «Guardar ingreso»: te lleva a su detalle.",
  ],
  consideraciones: [
    "Solo el monto (mayor a 0), la fuente y la fecha son obligatorios.",
    "Si recibís en otra moneda, la conversión es estimada: la cotización se fija al guardar.",
    "«Lo recibió» sos vos por defecto y solo aparece si hay más miembros en el espacio.",
    "Para ingresos que se repiten todos los meses, mejor cargá un ingreso fijo en Recurrentes.",
  ],
  relacionado: [
    { label: "Ingresos", href: "/ingresos" },
    { label: "Recurrentes", href: "/recurrentes" },
    { label: "Tarjetas y cuentas", href: "/tarjetas" },
  ],
};

export default function Page() {
  return (
    <AppShell focus>
      <div className="mx-auto w-full max-w-xl">
        <PageHeader
          title="Nuevo ingreso"
          className="items-center pt-2"
          action={
            <div className="flex items-center gap-2">
              <InfoHelp content={NUEVO_INGRESO_HELP} size="icon" />
              <CloseButton fallback="/ingresos" />
            </div>
          }
        />
        <IncomeForm />
      </div>
    </AppShell>
  );
}
