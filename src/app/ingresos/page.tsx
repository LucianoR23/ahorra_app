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
  ],
  consideraciones: [
    "Los ingresos fijos (sueldo, etc.) se generan solos desde Recurrentes; acá ves todos, los automáticos y los manuales.",
    "Los montos se muestran en tu moneda base; si el ingreso fue en otra moneda, debajo ves el monto original.",
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
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Ingresos</h1>
          <InfoHelp content={INGRESOS_HELP} size="icon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Sueldo, freelance, regalos — todo lo que entra al hogar.</p>
      </div>
      <IncomesList />
    </AppShell>
  );
}
