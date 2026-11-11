import { AppShell } from "@/components/app-shell";
import { IncomesList } from "@/components/incomes-list";
import { InfoHelp, type InfoHelpContent } from "@/components/ui/info-help";

const INGRESOS_HELP: InfoHelpContent = {
  titulo: "Ingresos",
  acciones: [
    "Navegá entre meses con las flechas para ver los ingresos de cada período.",
    "Mirá el total de ingresos del mes.",
    "Cargá un ingreso nuevo con el botón +.",
    "Tocá un ingreso para ver su detalle, editarlo o eliminarlo.",
    "Bajá tus ingresos en Excel con el botón de descarga: el mes que estás viendo o el año entero.",
  ],
  consideraciones: [
    "Los ingresos fijos (sueldo, etc.) se generan solos desde Recurrentes; acá ves todos, los automáticos y los manuales.",
    "Cada ingreso muestra su monto original; si fue en otra moneda, al lado ves cuánto es en pesos. Los totales van en pesos.",
  ],
  relacionado: [
    { label: "Nuevo ingreso", href: "/ingresos/nuevo" },
    { label: "Recurrentes", href: "/recurrentes" },
    { label: "Reportes", href: "/reportes" },
  ],
};

export default function Page() {
  return (
    <AppShell>
      <IncomesList help={<InfoHelp content={INGRESOS_HELP} size="icon" />} />
    </AppShell>
  );
}
